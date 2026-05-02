import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Timeouts tuned for Vercel serverless (hobby=10s, pro=60s)
const PROVIDER_TIMEOUT = 20_000;   // 20s per provider attempt
const MAX_RETRIES = 2;             // Max retries for 429
const RETRY_BASE_MS = 2_000;       // 2s base delay (2s, 4s)

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

/** Sleep for ms */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isVercel(): boolean {
  return !!(process.env.VERCEL || process.env.VERCEL_URL);
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

/**
 * Ensure Z-AI config is available. On Vercel, we rely on env vars;
 * locally we can also use the .z-ai-config file.
 */
async function ensureZAIConfig(): Promise<boolean> {
  // On Vercel: use env vars directly — don't try to write files
  if (isVercel()) {
    const baseUrl = process.env.ZAI_BASE_URL;
    const apiKey = process.env.ZAI_API_KEY;
    if (!baseUrl || !apiKey) return false;
    // Don't write to filesystem on Vercel (read-only)
    // The SDK should pick up env vars directly
    return true;
  }

  // Local: try existing config files first
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
  ];

  for (const p of configPaths) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      const config = JSON.parse(content);
      if (config.baseUrl && config.apiKey) {
        return true;
      }
    } catch {
      // File doesn't exist or invalid
    }
  }

  // Try env vars and create config file for local dev
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  if (!baseUrl || !apiKey) return false;

  try {
    const configPath = path.join(process.cwd(), '.z-ai-config');
    fs.writeFileSync(configPath, JSON.stringify({
      baseUrl,
      apiKey,
      chatId: process.env.ZAI_CHAT_ID,
      token: process.env.ZAI_TOKEN,
      userId: process.env.ZAI_USER_ID,
    }, null, 2));
    return true;
  } catch (err) {
    // Even if write fails, env vars might be picked up by SDK
    return true;
  }
}

async function tryZAI(base64: string, mimeType: string): Promise<ProviderResult> {
  try {
    const configReady = await ensureZAIConfig();
    if (!configReady) {
      return { success: false, error: 'Z-AI config not available (missing env vars)' };
    }

    const zai = await withTimeout(ZAI.create(), 10_000, 'Z-AI init');
    const imageUrl = `data:${mimeType};base64,${base64}`;

    // Try vision API first — this is the primary path
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
      // If it's a timeout, don't bother trying chat fallback (likely also slow)
      if (msg.includes('timed out')) {
        return { success: false, error: `Z-AI Vision: ${msg}` };
      }
    }

    // Fallback: try regular chat API (if vision is not available)
    try {
      const response = await withTimeout(
        zai.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: PROMPT_TEXT + '\n\n[Note: Image could not be processed via vision API. Provide generic furniture estimates based on common dimensions.]',
            },
          ],
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
        // Shorter backoff: 2s, 4s (total 6s instead of 50s)
        const delay = RETRY_BASE_MS * (retryCount + 1);
        console.warn(`[analyze] Gemini 429 rate limit, retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        return tryGemini(base64, mimeType, retryCount + 1);
      }
      if (response.status === 429) {
        return { success: false, error: 'Gemini rate limit exceeded. Please wait a moment and try again.' };
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

function parseAIResponse(content: string): { parsed: unknown } | { error: string } {
  let jsonStr = content.trim();
  // Strip markdown code blocks
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
  }
  // Strip leading "Here is..." text that some models add before JSON
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
  } catch (e) {
    console.error('[analyze] JSON parse failed. Raw (first 500 chars):', content.substring(0, 500));
    return { error: 'Failed to parse furniture data from AI response' };
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Accept both JSON body and FormData
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
      // JSON body: { image: base64string }
      const body = await req.json();
      const image = body.image as string;

      if (!image) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 });
      }

      // Handle data URL format
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

    // Build provider list — try sequentially (Z-AI first, then Gemini)
    // Sequential is more reliable than racing on serverless with limited time
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
        // Parse failed, try next provider
        console.warn('[analyze] Z-AI response parsed failed, trying fallback...');
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

    // All providers failed
    const allErrors = results.map((r) => r.error || 'Unknown error').join('; ');
    const hasRateLimit = allErrors.includes('429') || allErrors.includes('rate limit');
    const hasTimeout = allErrors.includes('timed out') || allErrors.includes('TimeoutError');

    console.error(`[analyze] All providers failed. Errors: ${allErrors}. Total time: ${Date.now() - startTime}ms`);

    if (results.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No AI providers configured. Set ZAI_BASE_URL + ZAI_API_KEY or GEMINI_API_KEY env vars.',
          code: 'NO_PROVIDERS',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: hasRateLimit
          ? 'AI service rate limit reached. Please wait 30 seconds and try again.'
          : hasTimeout
            ? 'AI analysis timed out. The servers may be busy — please try again in a moment.'
            : 'AI analysis failed. Please try again.',
        details: allErrors,
        code: hasRateLimit ? 'RATE_LIMITED' : hasTimeout ? 'TIMEOUT' : 'PROVIDER_ERROR',
      },
      { status: hasRateLimit ? 429 : 502 }
    );
  } catch (error) {
    console.error('[analyze] Unexpected error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze image. Please try again.',
        details: msg,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
