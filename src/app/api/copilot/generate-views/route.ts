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
}

function buildViewPrompt(view: string, data: FurnitureInfo): string {
  const { productType, style, material, finish, feature, dimensions, colorPalette, brand } = data;
  const h = dimensions.height;
  const w = dimensions.width;
  const d = dimensions.depth;
  const sh = dimensions.seatHeight ? ` Seat height: ${dimensions.seatHeight}cm.` : '';

  const viewDescriptions: Record<string, string> = {
    front: `FRONT VIEW — Looking straight at the front of the ${productType}. Show full height (${h}cm) and width (${w}cm) with dimension lines. ${brand} header at top. Pearl gray (#E5E5E5) background.`,
    side: `SIDE VIEW — Looking from the right side of the ${productType}. Show full height (${h}cm) and depth (${d}cm) with dimension lines. ${brand} header at top. Pearl gray (#E5E5E5) background.`,
    top: `TOP/DOWN VIEW — Looking down from above at the ${productType}. Show width (${w}cm) and depth (${d}cm) with dimension lines. ${brand} header at top. Pearl gray (#E5E5E5) background.`,
    perspective: `ELEVATED 3/4 PERSPECTIVE — Looking at the ${productType} from an elevated 3/4 angle showing front, side and top simultaneously. ${brand} header at top. Pearl gray (#E5E5E5) background. Photorealistic rendering.`,
  };

  return `Create a professional furniture technical product sheet render. ${viewDescriptions[view]}

Furniture: ${style} ${productType}
Main material: ${material.main} (${material.details.join(', ')})
Finish: ${finish}
Distinctive feature: ${feature}
Dimensions: H${h}cm x W${w}cm x D${d}cm${sh}
Colors: Primary ${colorPalette.primary}, Secondary ${colorPalette.secondary}

Style: Photorealistic product photography on pearl gray background. Architectural precision. Balanced studio lighting. Professional typography. Include dimension lines in centimeters with arrows. Include annotation callouts for material, joinery, and functional highlights. Include color palette strip at bottom showing: ${colorPalette.primary} (material), ${colorPalette.secondary} (feature), #E5E5E5 (pearl gray), #4A4A4A (dark gray). Include ${brand} logo header at top. High resolution, print-quality rendering.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const furnitureData = body.furnitureData as FurnitureInfo;
    const views = body.views as string[] || ['front', 'side', 'top', 'perspective'];

    if (!furnitureData) {
      return NextResponse.json({ error: 'No furniture data provided' }, { status: 400 });
    }

    const results: Record<string, string | null> = {};
    const useZai = await ensureZAIConfig();
    const useAzure = isAzureConfigured();

    if (!useZai && !useAzure) {
      return NextResponse.json({ error: 'No AI image generation providers configured. Z-AI should work by default.' }, { status: 503 });
    }

    // Generate views sequentially to avoid rate limits
    for (const view of views) {
      const prompt = buildViewPrompt(view, furnitureData);
      console.log(`[copilot-views] Generating ${view} view...`);

      let imageBase64: string | null = null;

      // ── Provider 1: Z-AI Image Generation — PRIMARY ──
      // Works immediately without any Azure configuration
      if (useZai) {
        try {
          const zai = await withTimeout(ZAI.create(), 8_000, 'Z-AI init');
          const response = await withTimeout(
            zai.images.generations.create({
              prompt,
              size: '1024x1024',
            }),
            45_000,
            `Z-AI Image (${view})`
          );
          imageBase64 = response.data?.[0]?.base64 || null;
          if (imageBase64) {
            console.log(`[copilot-views] ✅ Z-AI generated ${view} view`);
          }
        } catch (err) {
          console.warn(`[copilot-views] Z-AI image generation failed for ${view}:`, err instanceof Error ? err.message : String(err));
        }
      }

      // ── Provider 2: Azure OpenAI DALL-E 3 — OPTIONAL ──
      if (!imageBase64 && useAzure) {
        try {
          const result = await withTimeout(
            azureGenerateImage(prompt, '1024x1024', 'hd'),
            60_000,
            `Azure DALL-E 3 (${view})`
          );
          if (result.success && result.base64) {
            imageBase64 = result.base64;
            console.log(`[copilot-views] ✅ Azure DALL-E 3 generated ${view} view`);
          }
        } catch (err) {
          console.warn(`[copilot-views] Azure DALL-E 3 failed for ${view}:`, err instanceof Error ? err.message : String(err));
        }
      }

      results[view] = imageBase64;
    }

    const successCount = Object.values(results).filter(Boolean).length;
    console.log(`[copilot-views] Generated ${successCount}/${views.length} views`);

    return NextResponse.json({
      success: successCount > 0,
      viewImages: results,
      generatedCount: successCount,
    });
  } catch (error) {
    console.error('[copilot-views] Error:', error);
    return NextResponse.json({
      error: 'Failed to generate view images',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
