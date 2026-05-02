/**
 * Microsoft Azure OpenAI Provider Configuration
 *
 * Powers the VIVA MOBILI Copilot with Microsoft Copilot technology.
 * Uses Azure OpenAI Service (GPT-4o Vision + DALL-E 3).
 *
 * Required environment variables:
 * - AZURE_OPENAI_API_KEY: Your Azure OpenAI resource key
 * - AZURE_OPENAI_ENDPOINT: e.g. https://your-resource.openai.azure.com
 * - AZURE_OPENAI_API_VERSION: e.g. 2025-04-01-preview
 * - AZURE_OPENAI_DEPLOYMENT_NAME: GPT-4o deployment name (e.g. "gpt-4o")
 * - AZURE_OPENAI_VISION_DEPLOYMENT: GPT-4o vision deployment name (optional, defaults to DEPLOYMENT_NAME)
 * - AZURE_OPENAI_DALLE_DEPLOYMENT: DALL-E 3 deployment name (e.g. "dall-e-3")
 *
 * IMPORTANT: Use GPT-4o (not GPT-4 which was deprecated Nov 2025).
 * Deploy these models in Azure AI Studio / Azure Portal:
 *   1. gpt-4o   → for image analysis (vision)
 *   2. dall-e-3 → for image generation
 */

import { AzureOpenAI } from 'openai';

// Azure OpenAI client singleton
let _azureClient: AzureOpenAI | null = null;

export function isAzureConfigured(): boolean {
  return !!(
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_ENDPOINT
  );
}

export function getAzureOpenAIClient(): AzureOpenAI | null {
  if (!isAzureConfigured()) return null;

  if (!_azureClient) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, '');
    const apiKey = process.env.AZURE_OPENAI_API_KEY!;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-04-01-preview';

    _azureClient = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion,
    });
  }

  return _azureClient;
}

export function getChatDeployment(): string {
  return process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
}

export function getVisionDeployment(): string {
  return process.env.AZURE_OPENAI_VISION_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
}

export function getDalleDeployment(): string {
  return process.env.AZURE_OPENAI_DALLE_DEPLOYMENT || 'dall-e-3';
}

/**
 * Call Azure OpenAI Chat/Vision completion
 * Uses GPT-4o with vision capabilities to analyze furniture images
 */
export async function azureVisionChat(
  prompt: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ success: boolean; content?: string; error?: string }> {
  const client = getAzureOpenAIClient();
  if (!client) return { success: false, error: 'Azure OpenAI not configured' };

  const deployment = getVisionDeployment();

  try {
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    const response = await client.chat.completions.create({
      model: deployment,
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
      return { success: false, error: 'Azure OpenAI returned empty response' };
    }

    return { success: true, content };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[azure] Vision chat failed:', msg);
    return { success: false, error: `Azure OpenAI: ${msg}` };
  }
}

/**
 * Call Azure OpenAI Chat completion (no image)
 * Uses GPT-4o for text-only analysis as fallback
 */
export async function azureChat(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ success: boolean; content?: string; error?: string }> {
  const client = getAzureOpenAIClient();
  if (!client) return { success: false, error: 'Azure OpenAI not configured' };

  const deployment = getChatDeployment();

  try {
    const response = await client.chat.completions.create({
      model: deployment,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 4000,
    });

    const content = response.choices?.[0]?.message?.content || '';
    if (!content || content.length < 10) {
      return { success: false, error: 'Azure OpenAI returned empty response' };
    }

    return { success: true, content };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[azure] Chat failed:', msg);
    return { success: false, error: `Azure OpenAI: ${msg}` };
  }
}

/**
 * Generate image using Azure OpenAI DALL-E 3
 * Creates photorealistic furniture views for the product sheet
 */
export async function azureGenerateImage(
  prompt: string,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
  quality: 'standard' | 'hd' = 'hd'
): Promise<{ success: boolean; base64?: string; error?: string }> {
  const client = getAzureOpenAIClient();
  if (!client) return { success: false, error: 'Azure OpenAI not configured' };

  const deployment = getDalleDeployment();

  try {
    const response = await client.images.generate({
      model: deployment,
      prompt,
      n: 1,
      size,
      quality,
      response_format: 'b64_json',
    });

    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      return { success: false, error: 'Azure DALL-E returned no image' };
    }

    return { success: true, base64 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[azure] Image generation failed:', msg);
    return { success: false, error: `Azure DALL-E: ${msg}` };
  }
}
