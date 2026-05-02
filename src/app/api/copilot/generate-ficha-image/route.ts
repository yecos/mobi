import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { isOpenAIConfigured, openaiVisionChat, openaiGenerateImage } from '@/lib/openai-provider';
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

/**
 * Build the ficha image prompt using the SAME prompt the user uses in ChatGPT.
 * This is the exact prompt that generates photorealistic VIVA MOBILI product sheets.
 */
function buildFichaImagePrompt(data: FurnitureInfo): string {
  const { productType, style, material, finish, feature, dimensions, colorPalette, annotations, weight } = data;
  const h = dimensions.height;
  const w = dimensions.width;
  const d = dimensions.depth;
  const seatInfo = dimensions.seatHeight ? ` Seat height: ${dimensions.seatHeight}cm.` : '';

  return `Generate a realistic technical product sheet image for a VIVA MOBILI ${style} ${productType}.

PRODUCT DATA:
- Type: ${productType}
- Style: ${style}
- Material: ${material.main} (${material.details.join(', ')})
- Finish: ${finish}
- Feature: ${feature}
- Dimensions: Height ${h}cm × Width ${w}cm × Depth ${d}cm${seatInfo}
- Weight: ${weight} kg
- Annotations: ${annotations.join(' | ')}
- Colors: Primary ${colorPalette.primary}, Secondary ${colorPalette.secondary}

THE IMAGE MUST INCLUDE ALL OF THESE ELEMENTS:

1. HEADER: A horizontal bar at the top with "VIVA MOBILI" logo in bold white text on the left, and "PRODUCT TECHNICAL SHEET" in smaller white text on the right. Bar color: ${colorPalette.primary}.

2. PRODUCT TITLE: "${productType.toUpperCase()}" in large bold text. Below: "${style} style  •  ${material.main}  •  ${finish}" in smaller text. A thin ${colorPalette.primary} separator line.

3. FOUR VIEWS in a 2×2 grid on pearl gray (${colorPalette.pearlGray}) background boxes:
   - TOP LEFT: FRONT VIEW with dimension lines showing H=${h}cm and W=${w}cm
   - TOP RIGHT: SIDE VIEW with dimension lines showing H=${h}cm and D=${d}cm
   - BOTTOM LEFT: TOP VIEW with dimension lines showing W=${w}cm and D=${d}cm
   - BOTTOM RIGHT: 3/4 PERSPECTIVE elevated angle view
   Each view must be rendered PHOTOREALISTICALLY showing the actual ${productType} in ${material.main} with ${finish} finish.

4. SPECIFICATIONS section listing:
   Material: ${material.main}
   Finish: ${finish}
   Feature: ${feature}
   Height: ${h} cm
   Width: ${w} cm
   Depth: ${d} cm${dimensions.seatHeight ? `\n   Seat Height: ${dimensions.seatHeight} cm` : ''}
   Weight: ${weight} kg

5. DESIGN HIGHLIGHTS with icons:
   ◈ TEXTURE: ${annotations[0] || 'Material highlight'}
   ⬡ STRUCTURE: ${annotations[1] || 'Joinery detail'}
   ◆ FUNCTIONAL: ${annotations[2] || 'Feature detail'}

6. COLOR PALETTE strip: Four colored rectangles labeled:
   - ${colorPalette.primary} "Material"
   - ${colorPalette.secondary} "Feature"
   - ${colorPalette.pearlGray} "Pearl Gray"
   - ${colorPalette.darkGray} "Dark Gray"

7. FOOTER: A horizontal bar with "VIVA MOBILI  •  Professional Furniture Specifications" in white text.

STYLE: Photorealistic quality, architectural precision, balanced studio lighting, professional Helvetica typography, dimension lines with arrows in centimeters. The four views must look like real product photography on a neutral pearl gray background, not flat illustrations. The overall design should look like a premium furniture catalog specification page.`;
}

/**
 * Generate a photorealistic VIVA MOBILI product sheet image using AI.
 * Uses the same prompt structure that the user uses in ChatGPT for consistent results.
 * Now accepts the original furniture image to use as reference via vision-to-image generation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const furnitureData = body.furnitureData as FurnitureInfo;
    const originalImageBase64 = body.originalImage as string | undefined;

    if (!furnitureData) {
      return NextResponse.json({ error: 'No furniture data provided' }, { status: 400 });
    }

    const prompt = buildFichaImagePrompt(furnitureData);
    let imageBase64: string | null = null;

    // ── Strategy 1: OpenAI (ChatGPT) — PRIMARY ──
    // Uses GPT-4o Vision to enhance prompt with furniture photo details, then DALL-E 3 to generate
    if (isOpenAIConfigured()) {
      console.log('[copilot-ficha-image] Generating ficha image with OpenAI (ChatGPT)...');
      try {
        let enhancedPrompt = prompt;

        // If we have the original image, use GPT-4o Vision to enhance the prompt
        if (originalImageBase64) {
          console.log('[copilot-ficha-image] Enhancing prompt with GPT-4o Vision...');
          const visionResult = await withTimeout(
            openaiVisionChat(
              `Look at this furniture image carefully. I need you to enhance this product sheet generation prompt with specific visual details you can see in the image (exact color tones, texture descriptions, shape details, material appearance). Return ONLY the enhanced prompt text, nothing else:\n\n${prompt}`,
              originalImageBase64.startsWith('data:') ? originalImageBase64.split(',')[1] : originalImageBase64,
              'image/jpeg',
              { temperature: 0.3, maxTokens: 2000 }
            ),
            30_000,
            'OpenAI Vision Enhancement'
          );
          if (visionResult.success && visionResult.content) {
            enhancedPrompt = visionResult.content;
            console.log('[copilot-ficha-image] Prompt enhanced with GPT-4o Vision');
          }
        }

        // Generate the ficha image with DALL-E 3
        const dalleResult = await withTimeout(
          openaiGenerateImage(
            enhancedPrompt.length > 3000 ? enhancedPrompt.substring(0, 3000) : enhancedPrompt,
            '1024x1792',
            'hd'
          ),
          90_000,
          'OpenAI DALL-E 3 Ficha Image'
        );
        if (dalleResult.success && dalleResult.base64) {
          imageBase64 = dalleResult.base64;
          console.log('[copilot-ficha-image] ✅ OpenAI (ChatGPT + DALL-E 3) ficha image generated');
        }
      } catch (err) {
        console.warn('[copilot-ficha-image] OpenAI failed:', err instanceof Error ? err.message : String(err));
      }
    }

    // ── Strategy 2: Z-AI Vision + Image Generation — FALLBACK ──
    const useZai = await ensureZAIConfig();
    if (useZai && originalImageBase64) {
      console.log('[copilot-ficha-image] Generating ficha image with Z-AI Vision (image reference)...');
      try {
        const zai = await withTimeout(ZAI.create(), 8_000, 'Z-AI init');

        // Use vision chat to understand the furniture, then generate image
        // First: ask vision model to enhance the prompt based on the actual furniture photo
        const visionResponse = await withTimeout(
          zai.chat.completions.create({
            model: 'glm-4v-plus',
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Look at this furniture image carefully. I need you to enhance this product sheet generation prompt with specific visual details you can see in the image (exact color tones, texture descriptions, shape details, material appearance). Return ONLY the enhanced prompt text, nothing else:\n\n${prompt}`,
                },
                {
                  type: 'image_url',
                  image_url: { url: originalImageBase64.startsWith('data:') ? originalImageBase64 : `data:image/jpeg;base64,${originalImageBase64}` },
                },
              ],
            }],
            stream: false,
          }),
          30_000,
          'Z-AI Vision Enhancement'
        );

        const enhancedPrompt = visionResponse.choices?.[0]?.message?.content || prompt;
        console.log('[copilot-ficha-image] Prompt enhanced with furniture visual details');

        // Now generate the image with the enhanced prompt
        const imageResponse = await withTimeout(
          zai.images.generations.create({
            prompt: enhancedPrompt.length > 3000 ? enhancedPrompt.substring(0, 3000) : enhancedPrompt,
            size: '768x1344',
          }),
          60_000,
          'Z-AI Ficha Image (Enhanced)'
        );
        imageBase64 = imageResponse.data?.[0]?.base64 || null;
        if (imageBase64) {
          console.log('[copilot-ficha-image] ✅ Z-AI ficha image generated with furniture reference');
        }
      } catch (err) {
        console.warn('[copilot-ficha-image] Z-AI Vision+Image failed:', err instanceof Error ? err.message : String(err));
      }
    }

    // ── Strategy 2: Z-AI Image Generation (without furniture reference) ──
    if (!imageBase64 && useZai) {
      console.log('[copilot-ficha-image] Generating ficha image with Z-AI (text only)...');
      try {
        const zai = await withTimeout(ZAI.create(), 8_000, 'Z-AI init');
        const response = await withTimeout(
          zai.images.generations.create({
            prompt,
            size: '768x1344',
          }),
          60_000,
          'Z-AI Ficha Image'
        );
        imageBase64 = response.data?.[0]?.base64 || null;
        if (imageBase64) {
          console.log('[copilot-ficha-image] ✅ Z-AI ficha image generated');
        }
      } catch (err) {
        console.warn('[copilot-ficha-image] Z-AI image gen failed:', err instanceof Error ? err.message : String(err));
      }
    }

    // ── Provider 3: Azure OpenAI DALL-E 3 — OPTIONAL ──
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
