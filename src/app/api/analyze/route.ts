import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Timeouts tuned for Vercel serverless
const PROVIDER_TIMEOUT = 25_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 3_000;
// Max image dimension for AI analysis (reduce payload to avoid rate limits)
const MAX_IMAGE_DIM = 800;
const JPEG_QUALITY = 75;

/** Wrap a promise with a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isVercel(): boolean {
  return !!(process.env.VERCEL || process.env.VERCEL_URL);
}

/**
 * Resize and compress image server-side using sharp.
 * Reduces base64 size dramatically (often 10x), lowering rate-limit risk.
 */
async function compressImage(base64: string, mimeType: string): Promise<{ base64: string; mimeType: string }> {
  try {
    const sharp = (await import('sharp')).default;
    const inputBuffer = Buffer.from(base64, 'base64');

    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Only resize if larger than max dimension
    if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
      const resizedBuffer = await sharp(inputBuffer)
        .resize(MAX_IMAGE_DIM, MAX_IMAGE_DIM, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();

      console.log(`[analyze] Image compressed: ${width}x${height} → ${MAX_IMAGE_DIM}x, base64 ${base64.length} → ${resizedBuffer.toString('base64').length}`);
      return {
        base64: resizedBuffer.toString('base64'),
        mimeType: 'image/jpeg',
      };
    }

    // Already small enough, but convert to JPEG for consistency
    if (mimeType !== 'image/jpeg') {
      const convertedBuffer = await sharp(inputBuffer)
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
      return {
        base64: convertedBuffer.toString('base64'),
        mimeType: 'image/jpeg',
      };
    }

    return { base64, mimeType };
  } catch (err) {
    // If sharp fails, just use original image
    console.warn('[analyze] Image compression failed, using original:', err instanceof Error ? err.message : String(err));
    return { base64, mimeType };
  }
}

const PROMPT_TEXT = `Analyze this furniture image. Return JSON ONLY (no markdown, no code blocks):
{
  "productName": "string",
  "brand": "string or Unknown",
  "referenceNumber": "string or N/A",
  "description": "detailed English description",
  "descriptionEs": "same description in Spanish",
  "dimensions": {
    "height": { "feet": 0, "inches": 0 },
    "width": { "feet": 0, "inches": 0 },
    "depth": { "feet": 0, "inches": 0 },
    "widthExtended": { "feet": 0, "inches": 0 },
    "seatDepth": { "feet": 0, "inches": 0 },
    "depthExtended": { "feet": 0, "inches": 0 }
  },
  "materials": [{ "material": "string", "quantity": 1, "description": "string", "observations": "string" }],
  "quantity": 1,
  "colorFinishes": [{ "name": "string", "color": "#hex" }],
  "loungeConfigurations": [{ "name": "string", "units": 0 }],
  "category": "sofa|chair|table|cabinet|bed|desk|shelving",
  "tags": ["string"],
  "observations": "",
  "shapeProfile": {
    "bodyShape": "rectangular|rounded|curved|L-shape|circular|oval|tapered|organic",
    "cornerStyle": "sharp|slightly-rounded|fully-rounded|curved",
    "hasBackrest": false,
    "backrestShape": "flat|curved|winged|channel-tufted|solid-curved|none",
    "hasArmrests": false,
    "armrestShape": "none|straight|curved|scroll|integrated",
    "legType": "none|cylindrical|tapered|splayed|pedestal|block|metal-frame",
    "legCount": 4,
    "seatShape": "flat|cushioned|curved|bucket|saddle",
    "topViewOutline": "describe top-down shape",
    "sideProfile": "describe side profile shape"
  }
}

STANDARD ERGONOMIC MEASUREMENTS (use as reference):
- Chair: seat height ≈ 45cm (1'6"), total height ≈ 80-90cm (2'8"-3')
- Sofa: seat height ≈ 42-45cm (1'5"-1'6"), total height ≈ 80-100cm (2'8"-3'3")
- Table: table top height ≈ 75cm (2'6"), total height ≈ 75-78cm
- Bed: headboard above mattress ≈ 50cm (1'8"), mattress height ≈ 25-35cm

RULES: Dimensions in feet+inches (1m=3.28084ft). height,width,depth REQUIRED. widthExtended/seatDepth/depthExtended use {feet:0,inches:0} if N/A. shapeProfile REQUIRED. materials as array of objects with material, quantity, description, observations.`;

interface ProviderResult {
  success: boolean;
  data?: unknown;
  error?: string;
  provider?: string;
}

async function ensureZAIConfig(): Promise<boolean> {
  // Check if config already exists at standard paths
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
    '/tmp/.z-ai-config',  // Vercel writable tmp
  ];

  for (const p of configPaths) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      const config = JSON.parse(content);
      if (config.baseUrl && config.apiKey) {
        // On Vercel, skip internal IPs
        if (isVercel() && config.baseUrl.includes('172.')) continue;
        return true;
      }
    } catch {
      // File doesn't exist or invalid
    }
  }

  // Try to create config from env vars
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  if (!baseUrl || !apiKey) return false;

  // On Vercel, skip internal IPs
  if (isVercel() && baseUrl.includes('172.')) return false;

  // Try writing config file
  const configData = JSON.stringify({
    baseUrl,
    apiKey,
    chatId: process.env.ZAI_CHAT_ID,
    token: process.env.ZAI_TOKEN,
    userId: process.env.ZAI_USER_ID,
  }, null, 2);

  // Try multiple writable locations
  const writePaths = isVercel()
    ? ['/tmp/.z-ai-config']  // Only /tmp is writable on Vercel
    : [path.join(process.cwd(), '.z-ai-config'), '/tmp/.z-ai-config'];

  for (const writePath of writePaths) {
    try {
      fs.writeFileSync(writePath, configData);
      console.log(`[analyze] Z-AI config written to ${writePath}`);
      return true;
    } catch {
      // Can't write here, try next
    }
  }

  // Even if write fails, env vars exist — SDK might pick them up
  return true;
}

async function tryZAI(base64: string, mimeType: string): Promise<ProviderResult> {
  try {
    const configReady = await ensureZAIConfig();
    if (!configReady) {
      return { success: false, error: 'Z-AI config not available (missing ZAI_BASE_URL or ZAI_API_KEY env vars)' };
    }

    const zai = await withTimeout(ZAI.create(), 8_000, 'Z-AI init');
    const imageUrl = `data:${mimeType};base64,${base64}`;

    // Try vision API first
    try {
      const response = await withTimeout(
        zai.chat.completions.createVision({
          model: 'glm-4v-plus',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: PROMPT_TEXT },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          }],
          stream: false,
        }),
        PROVIDER_TIMEOUT,
        'Z-AI Vision'
      );

      const content = response.choices?.[0]?.message?.content || '';
      if (content && content.length > 10) {
        return { success: true, data: content, provider: 'Z-AI (GLM-4V Plus)' };
      }
    } catch (visionErr) {
      const msg = visionErr instanceof Error ? visionErr.message : String(visionErr);
      console.warn('[analyze] Z-AI vision failed:', msg);
      if (msg.includes('timed out')) {
        return { success: false, error: `Z-AI Vision: ${msg}` };
      }
    }

    // Fallback: try regular chat API (without image)
    try {
      const response = await withTimeout(
        zai.chat.completions.create({
          messages: [{
            role: 'user',
            content: PROMPT_TEXT + '\n\n[Note: Image could not be processed via vision API. Provide generic furniture estimates based on common dimensions for the most likely furniture type.]',
          }],
          stream: false,
        }),
        PROVIDER_TIMEOUT,
        'Z-AI Chat'
      );

      const content = response.choices?.[0]?.message?.content || '';
      if (content && content.length > 10) {
        return { success: true, data: content, provider: 'Z-AI (Chat Fallback)' };
      }
    } catch (chatErr) {
      const msg = chatErr instanceof Error ? chatErr.message : String(chatErr);
      console.warn('[analyze] Z-AI chat fallback also failed:', msg);
    }

    return { success: false, error: 'Z-AI returned empty response from all methods' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Z-AI failed: ${msg}` };
  }
}

async function tryGemini(base64: string, mimeType: string, retryCount = 0): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { success: false, error: 'GEMINI_API_KEY not configured' };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT_TEXT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 8000 },
        }),
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timer));

    if (!response.ok) {
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * (retryCount + 1);
        console.warn(`[analyze] Gemini 429 rate limit, retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        return tryGemini(base64, mimeType, retryCount + 1);
      }
      if (response.status === 429) {
        // Return the Retry-After header if available
        const retryAfter = response.headers.get('Retry-After');
        return {
          success: false,
          error: `Gemini rate limit exceeded.${retryAfter ? ` Retry after ${retryAfter}s.` : ' Please wait and try again.'}`,
        };
      }
      const errorBody = await response.text().catch(() => '');
      console.error(`[analyze] Gemini ${response.status}:`, errorBody.substring(0, 200));
      return { success: false, error: `Gemini ${response.status}: ${errorBody.substring(0, 100) || 'Unknown error'}` };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!content || content.length < 10) {
      return { success: false, error: 'Gemini returned empty response' };
    }
    return { success: true, data: content, provider: 'Gemini 2.0 Flash' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('abort') || msg.includes('AbortError')) {
      return { success: false, error: 'Gemini request timed out' };
    }
    return { success: false, error: `Gemini failed: ${msg}` };
  }
}

/**
 * Generate intelligent defaults based on furniture category.
 * Used as a last-resort fallback when all AI providers fail,
 * so the user can at least edit manually instead of being blocked.
 */
function generateSmartDefaults(category?: string): Record<string, unknown> {
  const cat = (category || 'sofa').toLowerCase();

  // Standard ergonomic dimensions per category
  const defaultsByCategory: Record<string, Record<string, unknown>> = {
    chair: {
      productName: 'Chair',
      category: 'chair',
      dimensions: {
        height: { feet: 2, inches: 10 },
        width: { feet: 1, inches: 10 },
        depth: { feet: 1, inches: 10 },
        widthExtended: { feet: 0, inches: 0 },
        seatDepth: { feet: 1, inches: 4 },
        depthExtended: { feet: 0, inches: 0 },
      },
      shapeProfile: {
        bodyShape: 'rectangular',
        cornerStyle: 'slightly-rounded',
        hasBackrest: true,
        backrestShape: 'flat',
        hasArmrests: false,
        armrestShape: 'none',
        legType: 'cylindrical',
        legCount: 4,
        seatShape: 'flat',
        topViewOutline: 'Rectangular seat with slim backrest',
        sideProfile: 'L-shaped with straight backrest',
      },
      materials: [{ material: 'Wood', quantity: 1, description: 'Frame structure', observations: '' }],
      description: 'Standard chair with ergonomic proportions.',
      descriptionEs: 'Silla estándar con proporciones ergonómicas.',
    },
    sofa: {
      productName: 'Sofa',
      category: 'sofa',
      dimensions: {
        height: { feet: 2, inches: 10 },
        width: { feet: 6, inches: 0 },
        depth: { feet: 2, inches: 6 },
        widthExtended: { feet: 0, inches: 0 },
        seatDepth: { feet: 1, inches: 10 },
        depthExtended: { feet: 0, inches: 0 },
      },
      shapeProfile: {
        bodyShape: 'rectangular',
        cornerStyle: 'slightly-rounded',
        hasBackrest: true,
        backrestShape: 'cushioned',
        hasArmrests: true,
        armrestShape: 'straight',
        legType: 'block',
        legCount: 4,
        seatShape: 'cushioned',
        topViewOutline: 'Rectangular with cushioned seats and armrests',
        sideProfile: 'L-shaped with padded backrest and seat cushion',
      },
      materials: [
        { material: 'Fabric', quantity: 1, description: 'Upholstery', observations: '' },
        { material: 'Foam', quantity: 1, description: 'Cushion filling', observations: '' },
        { material: 'Wood', quantity: 1, description: 'Frame structure', observations: '' },
      ],
      description: 'Standard three-seater sofa with cushioned seats and armrests.',
      descriptionEs: 'Sofá estándar de tres plazas con asientos acolchados y reposabrazos.',
    },
    table: {
      productName: 'Table',
      category: 'table',
      dimensions: {
        height: { feet: 2, inches: 6 },
        width: { feet: 4, inches: 0 },
        depth: { feet: 2, inches: 0 },
        widthExtended: { feet: 0, inches: 0 },
        seatDepth: { feet: 0, inches: 0 },
        depthExtended: { feet: 0, inches: 0 },
      },
      shapeProfile: {
        bodyShape: 'rectangular',
        cornerStyle: 'slightly-rounded',
        hasBackrest: false,
        backrestShape: 'none',
        hasArmrests: false,
        armrestShape: 'none',
        legType: 'tapered',
        legCount: 4,
        seatShape: 'flat',
        topViewOutline: 'Rectangular top surface with four leg positions',
        sideProfile: 'Flat top on tapered legs',
      },
      materials: [{ material: 'Wood', quantity: 1, description: 'Table top and legs', observations: '' }],
      description: 'Standard dining table with rectangular top.',
      descriptionEs: 'Mesa de comedor estándar con superficie rectangular.',
    },
    bed: {
      productName: 'Bed',
      category: 'bed',
      dimensions: {
        height: { feet: 3, inches: 0 },
        width: { feet: 5, inches: 0 },
        depth: { feet: 6, inches: 6 },
        widthExtended: { feet: 0, inches: 0 },
        seatDepth: { feet: 0, inches: 0 },
        depthExtended: { feet: 0, inches: 0 },
      },
      shapeProfile: {
        bodyShape: 'rectangular',
        cornerStyle: 'sharp',
        hasBackrest: false,
        backrestShape: 'none',
        hasArmrests: false,
        armrestShape: 'none',
        legType: 'block',
        legCount: 4,
        seatShape: 'flat',
        topViewOutline: 'Rectangular mattress with headboard at one end',
        sideProfile: 'Low frame with headboard extension',
      },
      materials: [
        { material: 'Wood', quantity: 1, description: 'Bed frame', observations: '' },
        { material: 'Fabric', quantity: 1, description: 'Headboard upholstery', observations: '' },
      ],
      description: 'Standard queen-size bed frame with headboard.',
      descriptionEs: 'Cama tamaño queen estándar con cabecera.',
    },
  };

  // Fallback for unknown categories
  const fallback = {
    productName: 'Furniture Piece',
    category: cat,
    dimensions: {
      height: { feet: 2, inches: 6 },
      width: { feet: 3, inches: 0 },
      depth: { feet: 1, inches: 6 },
      widthExtended: { feet: 0, inches: 0 },
      seatDepth: { feet: 0, inches: 0 },
      depthExtended: { feet: 0, inches: 0 },
    },
    shapeProfile: {
      bodyShape: 'rectangular',
      cornerStyle: 'sharp',
      hasBackrest: false,
      backrestShape: 'none',
      hasArmrests: false,
      armrestShape: 'none',
      legType: 'block',
      legCount: 4,
      seatShape: 'flat',
      topViewOutline: 'Rectangular shape',
      sideProfile: 'Rectangular box profile',
    },
    materials: [],
    description: 'Furniture piece — edit dimensions and details manually.',
    descriptionEs: 'Pieza de mobiliario — edita dimensiones y detalles manualmente.',
  };

  return defaultsByCategory[cat] || fallback;
}

function parseAIResponse(content: string): { parsed: unknown } | { error: string } {
  let jsonStr = content.trim();
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
  }
  const firstBrace = jsonStr.indexOf('{');
  const firstBracket = jsonStr.indexOf('[');
  if (firstBrace > 0 || firstBracket > 0) {
    const start = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket) ? firstBrace : firstBracket;
    const lastBrace = jsonStr.lastIndexOf('}');
    const lastBracket = jsonStr.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    jsonStr = jsonStr.substring(start, end + 1);
  }
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return { parsed };
  } catch {
    console.error('[analyze] JSON parse failed. Raw (first 500 chars):', content.substring(0, 500));
    return { error: 'Failed to parse furniture data from AI response' };
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    let base64: string;
    let mimeType: string;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const imageFile = formData.get('image') as File;
      if (!imageFile) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 });
      }
      const bytes = await imageFile.arrayBuffer();
      base64 = Buffer.from(bytes).toString('base64');
      mimeType = imageFile.type;
    } else {
      const body = await req.json();
      const image = body.image as string;
      if (!image) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 });
      }
      if (image.startsWith('data:')) {
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          mimeType = `image/${matches[1]}`;
          base64 = matches[2];
        } else {
          return NextResponse.json({ error: 'Invalid image data URL' }, { status: 400 });
        }
      } else {
        base64 = image;
        mimeType = 'image/jpeg';
      }
    }

    console.log(`[analyze] Image received, base64 length: ${base64.length}, elapsed: ${Date.now() - startTime}ms`);

    // Compress image server-side to reduce payload for AI providers
    const compressed = await compressImage(base64, mimeType);
    base64 = compressed.base64;
    mimeType = compressed.mimeType;

    console.log(`[analyze] After compression, base64 length: ${base64.length}, elapsed: ${Date.now() - startTime}ms`);

    // Try providers sequentially
    const results: ProviderResult[] = [];

    // Provider 1: Z-AI (primary)
    const zaiConfigReady = await ensureZAIConfig();
    if (zaiConfigReady) {
      console.log(`[analyze] Trying Z-AI provider...`);
      const zaiResult = await tryZAI(base64, mimeType);
      results.push(zaiResult);
      console.log(`[analyze] Z-AI result: success=${zaiResult.success}, elapsed: ${Date.now() - startTime}ms`);

      if (zaiResult.success && zaiResult.data) {
        const parsed = parseAIResponse(zaiResult.data as string);
        if ('parsed' in parsed) {
          return NextResponse.json({ success: true, data: parsed.parsed, provider: zaiResult.provider });
        }
        console.warn('[analyze] Z-AI response parse failed, trying fallback...');
      }
    }

    // Provider 2: Gemini (fallback)
    if (process.env.GEMINI_API_KEY) {
      console.log(`[analyze] Trying Gemini provider...`);
      const geminiResult = await tryGemini(base64, mimeType);
      results.push(geminiResult);
      console.log(`[analyze] Gemini result: success=${geminiResult.success}, elapsed: ${Date.now() - startTime}ms`);

      if (geminiResult.success && geminiResult.data) {
        const parsed = parseAIResponse(geminiResult.data as string);
        if ('parsed' in parsed) {
          return NextResponse.json({ success: true, data: parsed.parsed, provider: geminiResult.provider });
        }
      }
    }

    // All providers failed — return smart defaults with a flag so the client knows
    const allErrors = results.map((r) => r.error || 'Unknown error').join('; ');
    const hasRateLimit = allErrors.includes('429') || allErrors.toLowerCase().includes('rate limit');
    const hasTimeout = allErrors.includes('timed out') || allErrors.includes('TimeoutError');

    console.warn(`[analyze] All providers failed. Returning smart defaults. Errors: ${allErrors}. Total time: ${Date.now() - startTime}ms`);

    if (results.length === 0) {
      // No providers configured at all — return defaults with clear warning
      const defaults = generateSmartDefaults('sofa');
      return NextResponse.json({
        success: true,
        data: defaults,
        provider: 'Smart Defaults (no AI providers configured)',
        isEstimated: true,
        warning: 'No AI providers are configured. Showing estimated dimensions — please edit manually.',
      });
    }

    // Return smart defaults + error info so user can still edit
    const defaults = generateSmartDefaults('sofa');
    return NextResponse.json({
      success: true,
      data: defaults,
      provider: hasRateLimit ? 'Smart Defaults (AI rate limited)' : hasTimeout ? 'Smart Defaults (AI timed out)' : 'Smart Defaults (AI unavailable)',
      isEstimated: true,
      warning: hasRateLimit
        ? 'AI service is currently busy. Showing estimated dimensions — please verify and edit manually, or retry in 30 seconds.'
        : hasTimeout
          ? 'AI analysis timed out. Showing estimated dimensions — please verify and edit manually, or retry in a moment.'
          : 'AI analysis failed. Showing estimated dimensions — please edit manually.',
      retryable: true,
      originalError: allErrors,
    });
  } catch (error) {
    console.error('[analyze] Unexpected error:', error);
    const msg = error instanceof Error ? error.message : String(error);

    // Even on unexpected error, return defaults so user isn't blocked
    const defaults = generateSmartDefaults('sofa');
    return NextResponse.json({
      success: true,
      data: defaults,
      provider: 'Smart Defaults (error)',
      isEstimated: true,
      warning: 'An unexpected error occurred. Showing estimated dimensions — please edit manually.',
      originalError: msg,
    });
  }
}
