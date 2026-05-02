/**
 * OpenAI Direct Provider Configuration (ChatGPT)
 *
 * Uses the official OpenAI API directly (not Azure).
 * This is the PRIMARY provider for the VIVA MOBILI Copilot.
 *
 * Required environment variables:
 * - OPENAI_API_KEY: Your OpenAI API key (sk-...)
 *
 * Optional:
 * - OPENAI_MODEL: Chat model (default: gpt-4o)
 * - OPENAI_VISION_MODEL: Vision model (default: gpt-4o)
 * - OPENAI_IMAGE_MODEL: Image generation model (default: dall-e-3)
 *
 * Get your API key at: https://platform.openai.com/api-keys
 */

import OpenAI from 'openai';

// OpenAI client singleton
let _openaiClient: OpenAI | null = null;

export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return false;
  // Reject placeholder keys
  const placeholders = ['your-openai-api-key-here', 'sk-your-key', 'xxx', 'placeholder', 'test'];
  if (placeholders.includes(key.toLowerCase().trim())) return false;
  // Must start with sk- or be a valid-looking key
  if (!key.startsWith('sk-') && key.length < 20) return false;
  return true;
}

export function getOpenAIClient(): OpenAI | null {
  if (!isOpenAIConfigured()) return null;

  if (!_openaiClient) {
    _openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return _openaiClient;
}

export function getChatModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

export function getVisionModel(): string {
  return process.env.OPENAI_VISION_MODEL || 'gpt-4o';
}

export function getImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
}

/**
 * Call OpenAI Chat/Vision completion (ChatGPT with image analysis)
 * Uses GPT-4o with vision capabilities to analyze furniture images
 */
export async function openaiVisionChat(
  prompt: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ success: boolean; content?: string; error?: string }> {
  const client = getOpenAIClient();
  if (!client) return { success: false, error: 'OpenAI not configured (missing OPENAI_API_KEY)' };

  const model = getVisionModel();

  try {
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    const response = await client.chat.completions.create({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      }],
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 4000,
    });

    const content = response.choices?.[0]?.message?.content || '';
    if (!content || content.length < 10) {
      return { success: false, error: 'OpenAI returned empty response' };
    }

    return { success: true, content };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[openai] Vision chat failed:', msg);
    return { success: false, error: `OpenAI: ${msg}` };
  }
}

/**
 * Call OpenAI Chat completion (text only)
 * Uses GPT-4o for text-only analysis
 */
export async function openaiChat(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ success: boolean; content?: string; error?: string }> {
  const client = getOpenAIClient();
  if (!client) return { success: false, error: 'OpenAI not configured' };

  const model = getChatModel();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 4000,
    });

    const content = response.choices?.[0]?.message?.content || '';
    if (!content || content.length < 10) {
      return { success: false, error: 'OpenAI returned empty response' };
    }

    return { success: true, content };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[openai] Chat failed:', msg);
    return { success: false, error: `OpenAI: ${msg}` };
  }
}

/**
 * Generate image using OpenAI DALL-E 3
 * Creates photorealistic furniture views for the product sheet
 */
export async function openaiGenerateImage(
  prompt: string,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1792',
  quality: 'standard' | 'hd' = 'hd'
): Promise<{ success: boolean; base64?: string; error?: string }> {
  const client = getOpenAIClient();
  if (!client) return { success: false, error: 'OpenAI not configured' };

  const model = getImageModel();

  try {
    const response = await client.images.generate({
      model,
      prompt,
      n: 1,
      size,
      quality,
      response_format: 'b64_json',
    });

    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      return { success: false, error: 'OpenAI DALL-E returned no image' };
    }

    return { success: true, base64 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[openai] Image generation failed:', msg);
    return { success: false, error: `OpenAI DALL-E: ${msg}` };
  }
}
