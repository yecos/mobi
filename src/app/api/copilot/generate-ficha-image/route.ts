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
  // First check existing config files
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
        // Also write to /tmp for Z-AI SDK auto-discovery
        if (p !== '/tmp/.z-ai-config') {
          try { fs.writeFileSync('/tmp/.z-ai-config', content); } catch { /* ignore */ }
        }
        return true;
      }
    } catch { /* ignore */ }
  }

  // Try from env vars
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
 * Provider priority: OpenAI (ChatGPT + DALL-E 3) → Z-AI (GLM + Image Gen) → Azure DALL-E 3
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const furnitureData = body.furnitureData as FurnitureInfo;
    const originalImageBase64 = body.originalImage as string | undefined;

    if (!furnitureData) {
      return NextResponse.json({ error: 'No furniture data provided' }, { status: 400 });
    }

    const prompt = buildFichaImagePrompt(furnitureData);
    let imageBase64: string | null = null;
    let usedProvider = 'none';

    // ── Strategy 1: OpenAI (ChatGPT GPT-4o + DALL-E 3) — PRIMARY ──
    if (isOpenAIConfigured()) {
      console.log('[copilot-ficha-image] 🤖 Trying OpenAI (ChatGPT + DALL-E 3)...');
      try {
        let enhancedPrompt = prompt;

        // If we have the original image, use GPT-4o Vision to enhance the prompt
        if (originalImageBase64) {
          console.log('[copilot-ficha-image] Enhancing prompt with GPT-4o Vision...');
          try {
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
          } catch (visionErr) {
            console.warn('[copilot-ficha-image] GPT-4o Vision enhancement failed, using base prompt:', visionErr instanceof Error ? visionErr.message : String(visionErr));
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
          usedProvider = 'OpenAI (ChatGPT + DALL-E 3)';
          console.log(`[copilot-ficha-image] ✅ OpenAI ficha image generated in ${Date.now() - startTime}ms`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn('[copilot-ficha-image] OpenAI failed:', errMsg);
        if (errMsg.includes('429') || errMsg.includes('insufficient_quota') || errMsg.includes('quota')) {
          console.error('[copilot-ficha-image] ⚠️ OpenAI QUOTA EXCEEDED — Add billing at https://platform.openai.com/account/billing');
        }
      }
    } else {
      console.log('[copilot-ficha-image] ⏭️ OpenAI not configured (no valid API key), skipping');
    }

    // ── Strategy 2: Z-AI Vision + Image Generation — FALLBACK ──
    if (!imageBase64) {
      const zaiReady = await ensureZAIConfig();
      if (zaiReady) {
        console.log('[copilot-ficha-image] 🤖 Trying Z-AI (GLM-4V + Image Gen)...');
        try {
          const zai = await withTimeout(ZAI.create(), 10_000, 'Z-AI init');

          // First: Try with vision-enhanced prompt if we have the original image
          let enhancedPrompt = prompt;
          if (originalImageBase64) {
            console.log('[copilot-ficha-image] Enhancing prompt with Z-AI Vision (GLM-4V)...');
            try {
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

              const visionContent = visionResponse.choices?.[0]?.message?.content;
              if (visionContent && visionContent.length > 50) {
                enhancedPrompt = visionContent;
                console.log('[copilot-ficha-image] Prompt enhanced with Z-AI Vision');
              }
            } catch (visionErr) {
              console.warn('[copilot-ficha-image] Z-AI Vision enhancement failed, using base prompt:', visionErr instanceof Error ? visionErr.message : String(visionErr));
            }
          }

          // Generate the ficha image with Z-AI
          try {
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
              usedProvider = 'Z-AI (GLM-4V + Image Gen)';
              console.log(`[copilot-ficha-image] ✅ Z-AI ficha image generated (enhanced) in ${Date.now() - startTime}ms`);
            }
          } catch (imgErr) {
            console.warn('[copilot-ficha-image] Z-AI image gen (enhanced) failed:', imgErr instanceof Error ? imgErr.message : String(imgErr));
          }
        } catch (zaiErr) {
          console.warn('[copilot-ficha-image] Z-AI init failed:', zaiErr instanceof Error ? zaiErr.message : String(zaiErr));
        }
      } else {
        console.log('[copilot-ficha-image] ⏭️ Z-AI not available');
      }
    }

    // ── Strategy 3: Z-AI Image Generation (text-only prompt, no vision) ──
    if (!imageBase64) {
      const zaiReady = await ensureZAIConfig();
      if (zaiReady) {
        console.log('[copilot-ficha-image] 🤖 Trying Z-AI Image Gen (text-only prompt)...');
        try {
          const zai = await withTimeout(ZAI.create(), 10_000, 'Z-AI init');
          const response = await withTimeout(
            zai.images.generations.create({
              prompt,
              size: '768x1344',
            }),
            60_000,
            'Z-AI Ficha Image (Text Only)'
          );
          imageBase64 = response.data?.[0]?.base64 || null;
          if (imageBase64) {
            usedProvider = 'Z-AI (Image Gen)';
            console.log(`[copilot-ficha-image] ✅ Z-AI ficha image generated (text-only) in ${Date.now() - startTime}ms`);
          }
        } catch (err) {
          console.warn('[copilot-ficha-image] Z-AI text-only image gen failed:', err instanceof Error ? err.message : String(err));
        }
      }
    }

    // ── Strategy 4: Azure OpenAI DALL-E 3 — OPTIONAL ──
    if (!imageBase64 && isAzureConfigured()) {
      console.log('[copilot-ficha-image] 🤖 Trying Azure DALL-E 3...');
      try {
        const result = await withTimeout(
          azureGenerateImage(prompt, '1024x1792', 'hd'),
          90_000,
          'Azure DALL-E 3 Ficha Image'
        );
        if (result.success && result.base64) {
          imageBase64 = result.base64;
          usedProvider = 'Azure DALL-E 3';
          console.log(`[copilot-ficha-image] ✅ Azure DALL-E 3 ficha image generated in ${Date.now() - startTime}ms`);
        }
      } catch (err) {
        console.warn('[copilot-ficha-image] Azure DALL-E 3 failed:', err instanceof Error ? err.message : String(err));
      }
    }

    if (!imageBase64) {
      console.error(`[copilot-ficha-image] ❌ All providers failed after ${Date.now() - startTime}ms`);
      console.error('[copilot-ficha-image] 💡 FIX: Add credits to OpenAI or configure Azure deployment names');

      // Build specific troubleshooting info
      const troubleshooting: Record<string, string> = {};
      if (isOpenAIConfigured()) {
        troubleshooting.openai = 'API key found but likely has quota exceeded (429). Add billing at https://platform.openai.com/account/billing';
      } else {
        troubleshooting.openai = 'Not configured. Add OPENAI_API_KEY=sk-... to environment variables';
      }
      if (isAzureConfigured()) {
        troubleshooting.azure = `Configured (endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}) but deployment not found. Current deployment names: chat="${process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o (default)'}", dalle="${process.env.AZURE_OPENAI_DALLE_DEPLOYMENT || 'dall-e-3 (default)'}". Check your deployment names in Azure Portal → Azure AI Studio.`;
      } else {
        troubleshooting.azure = 'Not configured. Add AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT';
      }
      troubleshooting.gemini = process.env.GEMINI_API_KEY
        ? 'Configured but free tier has no image generation quota. Upgrade at https://ai.google.dev/pricing'
        : 'Not configured. Add GEMINI_API_KEY';

      return NextResponse.json({
        success: false,
        error: 'Failed to generate ficha image — all AI image providers failed',
        troubleshooting,
        quickFix: 'Easiest fix: Add $5 credits to your OpenAI account at https://platform.openai.com/account/billing',
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      image: imageBase64,
      provider: usedProvider,
    });
  } catch (error) {
    console.error('[copilot-ficha-image] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate ficha image',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
