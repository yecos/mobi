import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { isAzureConfigured, azureGenerateImage } from '@/lib/azure-openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

interface FurnitureInfo {
  productType: string;
  style: string;
  material: { main: string; details: string[] };
  finish: string;
  feature: string;
  dimensions: { height: number; width: number; depth: number; seatHeight: number | null };
  colorPalette: { primary: string; secondary: string; pearlGray: string; darkGray: string };
  brand: string;
  annotations: string[];
  weight: number;
}

function buildFichaImagePrompt(data: FurnitureInfo): string {
  const { productType, style, material, finish, feature, dimensions, colorPalette, brand, annotations, weight } = data;
  const h = dimensions.height;
  const w = dimensions.width;
  const d = dimensions.depth;
  const sh = dimensions.seatHeight ? ` Seat height: ${dimensions.seatHeight}cm.` : '';

  return `Create a professional VIVA MOBILI furniture technical product sheet as a single high-resolution image.

LAYOUT: Vertical A4 format product sheet with the following sections:

TOP: A horizontal header bar colored ${colorPalette.primary} with "VIVA MOBILI" in bold white text on the left and "PRODUCT TECHNICAL SHEET" in small white text on the right.

TITLE SECTION: The product type "${productType.toUpperCase()}" in large bold dark gray text. Below it: "${style} style  •  ${material.main}  •  ${finish}" in smaller gray text. A thin ${colorPalette.primary} horizontal line separator.

LEFT COLUMN - SPECIFICATIONS: A vertical list of specification rows, each with a light gray background pill showing the label on the left and value on the right:
- MATERIAL: ${material.main}
- FINISH: ${finish}
- FEATURE: ${feature}
- HEIGHT: ${h} cm
- WIDTH: ${w} cm
- DEPTH: ${d} cm
- WEIGHT: ${weight} kg${dimensions.seatHeight ? `\n- SEAT HEIGHT: ${dimensions.seatHeight} cm` : ''}

MATERIAL DETAILS: Small bullet points listing: ${material.details.join(', ')}

RIGHT COLUMN - FOUR VIEWS: A 2x2 grid of view boxes on ${colorPalette.pearlGray} background:
- TOP LEFT: FRONT VIEW showing the ${productType} from the front with dimension lines for H=${h}cm and W=${w}cm
- TOP RIGHT: SIDE VIEW showing from the side with dimension lines for H=${h}cm and D=${d}cm
- BOTTOM LEFT: TOP/DOWN VIEW showing from above with dimension lines for W=${w}cm and D=${d}cm
- BOTTOM RIGHT: 3/4 PERSPECTIVE VIEW showing an elevated 3/4 angle view

DESIGN HIGHLIGHTS: Three annotation rows with icons:
◈ TEXTURE: ${annotations[0] || 'Material highlight'}
⬡ STRUCTURE: ${annotations[1] || 'Joinery detail'}
◆ FUNCTIONAL: ${annotations[2] || 'Feature detail'}

COLOR PALETTE: A row of four colored rectangles:
- ${colorPalette.primary} labeled "Material"
- ${colorPalette.secondary} labeled "Feature"
- ${colorPalette.pearlGray} labeled "Pearl Gray"
- ${colorPalette.darkGray} labeled "Dark Gray"

FOOTER: A horizontal bar colored ${colorPalette.primary} with "VIVA MOBILI  •  Professional Furniture Specifications" in white text on the left and today's date on the right.

STYLE: Clean, professional, architectural precision. Helvetica typography. Studio lighting. Pearl gray backgrounds for view boxes. Print-quality resolution. No photorealistic furniture renders in the view boxes — use clean technical drawings with dimension lines and arrows. The overall design should look like a professional furniture catalog specification page.`;
}

/**
 * Generate a photorealistic VIVA MOBILI product sheet image using AI.
 * This creates a complete ficha as an AI-generated image alongside the JS data.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const furnitureData = body.furnitureData as FurnitureInfo;

    if (!furnitureData) {
      return NextResponse.json({ error: 'No furniture data provided' }, { status: 400 });
    }

    const prompt = buildFichaImagePrompt(furnitureData);
    let imageBase64: string | null = null;

    // ── Provider 1: Z-AI Image Generation — PRIMARY ──
    const useZai = await ensureZAIConfig();
    if (useZai) {
      console.log('[copilot-ficha-image] Generating ficha image with Z-AI...');
      try {
        const zai = await withTimeout(ZAI.create(), 8_000, 'Z-AI init');
        const response = await withTimeout(
          zai.images.generations.create({
            prompt,
            size: '768x1344', // A4-like proportions
          }),
          60_000,
          'Z-AI Ficha Image'
        );
        imageBase64 = response.data?.[0]?.base64 || null;
        if (imageBase64) {
          console.log('[copilot-ficha-image] ✅ Z-AI ficha image generated');
        }
      } catch (err) {
        console.warn('[copilot-ficha-image] Z-AI failed:', err instanceof Error ? err.message : String(err));
      }
    }

    // ── Provider 2: Azure OpenAI DALL-E 3 — OPTIONAL ──
    if (!imageBase64 && isAzureConfigured()) {
      console.log('[copilot-ficha-image] Trying Azure DALL-E 3...');
      try {
        const result = await withTimeout(
          azureGenerateImage(prompt, '1024x1792', 'hd'),
          90_000,
          'Azure DALL-E 3 Ficha Image'
        );
        if (result.success && result.base64) {
          imageBase64 = result.base64;
          console.log('[copilot-ficha-image] ✅ Azure DALL-E 3 ficha image generated');
        }
      } catch (err) {
        console.warn('[copilot-ficha-image] Azure DALL-E 3 failed:', err instanceof Error ? err.message : String(err));
      }
    }

    if (!imageBase64) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate ficha image — no AI image providers available',
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      image: imageBase64,
    });
  } catch (error) {
    console.error('[copilot-ficha-image] Error:', error);
    return NextResponse.json({
      error: 'Failed to generate ficha image',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
