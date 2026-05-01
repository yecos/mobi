import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PROVIDER_TIMEOUT = 25_000;
const QUICK_TIMEOUT = 15_000;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
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
  "materials": ["string"],
  "quantity": 1,
  "colorFinishes": [{ "name": "string", "color": "#hex" }],
  "loungeConfigurations": [{ "name": "string", "units": 0 }],
  "category": "sofa|chair|table|cabinet|bed|desk|shelving",
  "tags": ["string"],
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
RULES: Dimensions in feet+inches (1m=3.28084ft). height,width,depth REQUIRED. widthExtended/seatDepth/depthExtended use {feet:0,inches:0} if N/A. shapeProfile REQUIRED.`;

interface ProviderResult {
  success: boolean;
  data?: unknown;
  error?: string;
  provider?: string;
}

async function ensureZAIConfig(): Promise<boolean> {
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
        if (isVercel() && config.baseUrl.includes('172.')) {
          continue;
        }
        return true;
      }
    } catch {
      // File doesn't exist or invalid
    }
  }

  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  if (!baseUrl || !apiKey) return false;

  if (isVercel() && baseUrl.includes('172.')) {
    return false;
  }

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
    return false;
  }
}

async function tryZAI(base64: string, mimeType: string): Promise<ProviderResult> {
  try {
    const configReady = await ensureZAIConfig();
    if (!configReady) {
      return { success: false, error: 'Z-AI config not available' };
    }

    const zai = await ZAI.create();
    const imageUrl = `data:${mimeType};base64,${base64}`;

    const response = await zai.chat.completions.createVision({
      model: 'glm-4v-plus',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT_TEXT },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
      stream: false,
    });

    const content = response.choices?.[0]?.message?.content || '';
    if (!content || content.length < 10) {
      return { success: false, error: 'Z-AI returned empty response' };
    }

    return { success: true, data: content, provider: 'Z-AI (GLM-4V Plus)' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Z-AI failed: ${msg}` };
  }
}

async function tryGemini(base64: string, mimeType: string, retryCount = 0): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { success: false, error: 'GEMINI_API_KEY not set' };

  try {
    const response = await fetchWithTimeout(
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
      },
      PROVIDER_TIMEOUT
    );

    if (!response.ok) {
      if (response.status === 429 && retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 3000;
        await new Promise((r) => setTimeout(r, delay));
        return tryGemini(base64, mimeType, retryCount + 1);
      }
      return { success: false, error: `Gemini ${response.status}` };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!content || content.length < 10) {
      return { success: false, error: 'Gemini returned empty response' };
    }
    return { success: true, data: content, provider: 'Gemini 2.0 Flash' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
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

    console.log(`[analyze] Image received, base64 length: ${base64.length}`);

    // Try providers
    const providers: Array<() => Promise<ProviderResult>> = [];

    const zaiConfigReady = await ensureZAIConfig();
    if (zaiConfigReady) {
      providers.push(() => tryZAI(base64, mimeType));
    }

    if (process.env.GEMINI_API_KEY) providers.push(() => tryGemini(base64, mimeType));

    if (providers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No AI providers configured. Please set up API keys.' },
        { status: 500 }
      );
    }

    if (providers.length === 1) {
      const result = await providers[0]();
      if (result.success && result.data) {
        const parsed = parseAIResponse(result.data as string);
        if ('parsed' in parsed) {
          return NextResponse.json({ success: true, data: parsed.parsed, provider: result.provider });
        }
      }
      return NextResponse.json(
        { success: false, error: 'AI provider failed', details: result.error },
        { status: 500 }
      );
    }

    // Race all providers
    const errors: string[] = [];
    let resolved = false;

    const result = await new Promise<ProviderResult>((resolve) => {
      let pending = providers.length;

      for (const providerFn of providers) {
        providerFn().then((res) => {
          pending--;
          if (res.success && !resolved) {
            resolved = true;
            resolve(res);
          } else if (!res.success) {
            errors.push(res.error || 'Unknown error');
            if (pending === 0 && !resolved) {
              resolve({ success: false, error: errors.join('; ') });
            }
          }
        }).catch((err) => {
          pending--;
          errors.push(err instanceof Error ? err.message : String(err));
          if (pending === 0 && !resolved) {
            resolve({ success: false, error: errors.join('; ') });
          }
        });
      }
    });

    if (result.success && result.data) {
      const parsed = parseAIResponse(result.data as string);
      if ('parsed' in parsed) {
        return NextResponse.json({ success: true, data: parsed.parsed, provider: result.provider });
      }
      return NextResponse.json({ success: false, error: parsed.error }, { status: 500 });
    }

    return NextResponse.json(
      { success: false, error: 'All AI providers failed.', details: result.error },
      { status: 500 }
    );
  } catch (error) {
    console.error('[analyze] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze image: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
