import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { isAzureConfigured, azureVisionChat, azureChat } from '@/lib/azure-openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PROVIDER_TIMEOUT = 30_000;
const MAX_IMAGE_DIM = 800;
const JPEG_QUALITY = 75;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

function isVercel(): boolean {
  return !!(process.env.VERCEL || process.env.VERCEL_URL);
}

async function compressImage(base64: string, mimeType: string): Promise<{ base64: string; mimeType: string }> {
  try {
    const sharp = (await import('sharp')).default;
    const inputBuffer = Buffer.from(base64, 'base64');
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
      const resizedBuffer = await sharp(inputBuffer)
        .resize(MAX_IMAGE_DIM, MAX_IMAGE_DIM, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
      return { base64: resizedBuffer.toString('base64'), mimeType: 'image/jpeg' };
    }

    if (mimeType !== 'image/jpeg') {
      const convertedBuffer = await sharp(inputBuffer).jpeg({ quality: JPEG_QUALITY }).toBuffer();
      return { base64: convertedBuffer.toString('base64'), mimeType: 'image/jpeg' };
    }

    return { base64, mimeType };
  } catch {
    return { base64, mimeType };
  }
}

async function ensureZAIConfig(): Promise<boolean> {
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
    '/tmp/.z-ai-config',
  ];
  for (const p of configPaths) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      const config = JSON.parse(content);
      if (config.baseUrl && config.apiKey) {
        if (isVercel() && config.baseUrl.includes('172.')) continue;
        return true;
      }
    } catch { /* ignore */ }
  }
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  if (!baseUrl || !apiKey) return false;
  if (isVercel() && baseUrl.includes('172.')) return false;

  const configData = JSON.stringify({
    baseUrl, apiKey,
    chatId: process.env.ZAI_CHAT_ID,
    token: process.env.ZAI_TOKEN,
    userId: process.env.ZAI_USER_ID,
  }, null, 2);

  const writePaths = isVercel() ? ['/tmp/.z-ai-config'] : [path.join(process.cwd(), '.z-ai-config'), '/tmp/.z-ai-config'];
  for (const writePath of writePaths) {
    try { fs.writeFileSync(writePath, configData); return true; } catch { /* ignore */ }
  }
  return true;
}

const COPILOT_ANALYSIS_PROMPT = `Analyze this furniture image carefully and extract the following information. Return JSON ONLY (no markdown, no code blocks):

{
  "productType": "<chair|stool|table|sofa|bed|desk|cabinet|shelving|bench|ottoman>",
  "style": "<modern|minimalist|luxury|industrial|scandinavian|mid-century|rustic|transitional|contemporary|art-deco>",
  "material": {
    "main": "<wood|metal|fabric|leather|glass|stone|rattan|bamboo|plastic|composite>",
    "details": ["<specific material detail 1>", "<specific material detail 2>", "<specific material detail 3>"]
  },
  "finish": "<natural|matte|polished|lacquered|oiled|waxed|brushed|powder-coated|upholstered|stained>",
  "feature": "<woven cane|modularity|storage|reclining|extendable|foldable|stackable|convertible|built-in lighting|adjustable height|any distinctive feature>",
  "dimensions": {
    "height": <height_in_cm_as_number>,
    "width": <width_in_cm_as_number>,
    "depth": <depth_in_cm_as_number>,
    "seatHeight": <seat_height_in_cm_as_number_or_null_if_not_applicable>
  },
  "weight": <weight_in_kg_as_number>,
  "annotations": [
    "<annotation describing material highlight, e.g. 'Solid oak frame with visible grain pattern'>",
    "<annotation describing joinery/construction, e.g. 'Mortise and tenon joints at frame connections'>",
    "<annotation describing texture/functional detail, e.g. 'Hand-woven cane panel with natural finish'>"
  ],
  "colorPalette": {
    "primary": "<hex color of main material>",
    "secondary": "<hex color of accent/feature>",
    "pearlGray": "#E5E5E5",
    "darkGray": "#4A4A4A"
  },
  "brand": "VIVA MOBILI",
  "renderViews": ["front", "side", "top", "perspective"]
}

STANDARD ERGONOMIC MEASUREMENTS (use as reference for realistic dimensions):
- Chair: seat height 45cm, total height 80-90cm, width 45-55cm, depth 50-55cm, weight 4-8kg
- Stool: seat height 65-75cm, total height 65-80cm, width 35-45cm, depth 35-45cm, weight 3-6kg
- Sofa: seat height 42-45cm, total height 80-100cm, width 180-240cm, depth 80-100cm, weight 30-80kg
- Table: height 72-78cm, width 80-200cm, depth 60-120cm, weight 15-50kg
- Desk: height 72-76cm, width 120-180cm, depth 60-80cm, weight 20-40kg
- Bed: height 45-55cm (mattress top), width 90-180cm, depth 190-210cm, weight 30-60kg
- Cabinet: height 80-200cm, width 60-120cm, depth 40-60cm, weight 20-60kg
- Bench: seat height 45cm, total height 45-90cm, width 120-180cm, depth 40-50cm, weight 10-25kg

RULES:
1. All dimensions in CENTIMETERS as numbers (not strings).
2. seatHeight is null for tables, cabinets, shelving, beds (anything without a seat).
3. weight should be a realistic estimate in kilograms.
4. colorPalette.primary and secondary must be valid hex colors extracted from the image.
5. annotations must be exactly 3 descriptive strings about material, joinery, and functional highlights.
6. material.details should list 2-4 specific material characteristics.
7. Be specific with feature - describe the most distinctive design element.
8. brand must always be "VIVA MOBILI".`;

function parseAIResponse(content: string): { parsed: unknown } | { error: string } {
  let jsonStr = content.trim();
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
  }
  const firstBrace = jsonStr.indexOf('{');
  if (firstBrace > 0) {
    const lastBrace = jsonStr.lastIndexOf('}');
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }
  try {
    return { parsed: JSON.parse(jsonStr) };
  } catch {
    return { error: 'Failed to parse copilot furniture data from AI response' };
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

    console.log(`[copilot] Image received, base64 length: ${base64.length}, elapsed: ${Date.now() - startTime}ms`);

    const compressed = await compressImage(base64, mimeType);
    base64 = compressed.base64;
    mimeType = compressed.mimeType;

    // ── Provider 1: Microsoft Azure OpenAI (GPT-4o Vision) — PRIMARY ──
    if (isAzureConfigured()) {
      console.log(`[copilot] Trying Microsoft Azure OpenAI (GPT-4o Vision)...`);
      try {
        const result = await withTimeout(
          azureVisionChat(COPILOT_ANALYSIS_PROMPT, base64, mimeType, { temperature: 0.2, maxTokens: 4000 }),
          PROVIDER_TIMEOUT,
          'Azure OpenAI Vision'
        );

        if (result.success && result.content) {
          const parsed = parseAIResponse(result.content);
          if ('parsed' in parsed) {
            console.log(`[copilot] ✅ Azure OpenAI analysis success, elapsed: ${Date.now() - startTime}ms`);
            return NextResponse.json({
              success: true,
              data: parsed.parsed,
              provider: 'Microsoft Azure OpenAI (GPT-4o Vision)',
            });
          }
          console.warn('[copilot] Azure OpenAI response parse failed, trying fallback...');
        }
      } catch (err) {
        console.warn('[copilot] Azure OpenAI failed:', err instanceof Error ? err.message : String(err));
      }
    }

    // ── Provider 2: Z-AI Vision — FALLBACK ──
    const zaiConfigReady = await ensureZAIConfig();
    if (zaiConfigReady) {
      console.log(`[copilot] Trying Z-AI provider...`);
      try {
        const zai = await withTimeout(ZAI.create(), 8_000, 'Z-AI init');
        const imageUrl = `data:${mimeType};base64,${base64}`;

        const response = await withTimeout(
          zai.chat.completions.createVision({
            model: 'glm-4v-plus',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: COPILOT_ANALYSIS_PROMPT },
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
          const parsed = parseAIResponse(content);
          if ('parsed' in parsed) {
            console.log(`[copilot] Z-AI analysis success, elapsed: ${Date.now() - startTime}ms`);
            return NextResponse.json({ success: true, data: parsed.parsed, provider: 'Z-AI (GLM-4V Plus)' });
          }
        }
      } catch (err) {
        console.warn('[copilot] Z-AI failed:', err instanceof Error ? err.message : String(err));
      }
    }

    // ── Provider 3: Gemini — FALLBACK ──
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      console.log(`[copilot] Trying Gemini provider...`);
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
                  { text: COPILOT_ANALYSIS_PROMPT },
                  { inline_data: { mime_type: mimeType, data: base64 } },
                ],
              }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
            }),
            signal: controller.signal,
          }
        ).finally(() => clearTimeout(timer));

        if (response.ok) {
          const data = await response.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (content && content.length > 10) {
            const parsed = parseAIResponse(content);
            if ('parsed' in parsed) {
              console.log(`[copilot] Gemini analysis success, elapsed: ${Date.now() - startTime}ms`);
              return NextResponse.json({ success: true, data: parsed.parsed, provider: 'Gemini 2.0 Flash' });
            }
          }
        }
      } catch (err) {
        console.warn('[copilot] Gemini failed:', err instanceof Error ? err.message : String(err));
      }
    }

    // ── Provider 4: Azure OpenAI Chat (no vision) — TEXT FALLBACK ──
    if (isAzureConfigured()) {
      console.log(`[copilot] Trying Azure OpenAI chat (no vision)...`);
      try {
        const result = await withTimeout(
          azureChat(
            COPILOT_ANALYSIS_PROMPT + '\n\n[Note: Image could not be processed via vision API. Provide a generic furniture analysis for a modern wooden chair with cane seat as the most likely type.]',
            { temperature: 0.3 }
          ),
          PROVIDER_TIMEOUT,
          'Azure OpenAI Chat'
        );

        if (result.success && result.content) {
          const parsed = parseAIResponse(result.content);
          if ('parsed' in parsed) {
            return NextResponse.json({
              success: true,
              data: parsed.parsed,
              provider: 'Microsoft Azure OpenAI (Chat)',
              isEstimated: true,
            });
          }
        }
      } catch (err) {
        console.warn('[copilot] Azure OpenAI chat failed:', err instanceof Error ? err.message : String(err));
      }
    }

    // ── Ultimate fallback with smart defaults ──
    const fallbackData = {
      productType: 'chair',
      style: 'modern',
      material: { main: 'wood', details: ['Solid frame construction', 'Natural grain finish', 'Reinforced joints'] },
      finish: 'natural',
      feature: 'Ergonomic design',
      dimensions: { height: 85, width: 50, depth: 52, seatHeight: 45 },
      weight: 5,
      annotations: ['Solid wood frame with visible grain', 'Traditional joinery construction', 'Comfortable ergonomic seat'],
      colorPalette: { primary: '#8B7355', secondary: '#D4A574', pearlGray: '#E5E5E5', darkGray: '#4A4A4A' },
      brand: 'VIVA MOBILI',
      renderViews: ['front', 'side', 'top', 'perspective'],
    };

    return NextResponse.json({
      success: true,
      data: fallbackData,
      provider: 'Smart Defaults (AI unavailable)',
      isEstimated: true,
      warning: 'AI vision was unavailable. Showing estimated data — please verify and edit.',
    });
  } catch (error) {
    console.error('[copilot] Unexpected error:', error);

    const fallbackData = {
      productType: 'chair',
      style: 'modern',
      material: { main: 'wood', details: ['Solid frame construction', 'Natural grain finish'] },
      finish: 'natural',
      feature: 'Ergonomic design',
      dimensions: { height: 85, width: 50, depth: 52, seatHeight: 45 },
      weight: 5,
      annotations: ['Solid wood frame', 'Quality construction', 'Functional design'],
      colorPalette: { primary: '#8B7355', secondary: '#D4A574', pearlGray: '#E5E5E5', darkGray: '#4A4A4A' },
      brand: 'VIVA MOBILI',
      renderViews: ['front', 'side', 'top', 'perspective'],
    };

    return NextResponse.json({
      success: true,
      data: fallbackData,
      provider: 'Smart Defaults (error)',
      isEstimated: true,
      warning: 'An error occurred. Showing estimated data — please verify.',
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}
