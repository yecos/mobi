/**
 * Google Gemini Provider Configuration
 *
 * Uses the Google Generative Language API (Gemini) for text/vision analysis.
 * Automatically tries multiple model versions as fallback:
 *   1. gemini-2.0-flash (newest, may have quota limits on free tier)
 *   2. gemini-1.5-flash (widely available on free tier)
 *   3. gemini-1.5-pro (more capable, lower free tier limits)
 *
 * Required environment variables:
 * - GEMINI_API_KEY: Your Google AI API key
 *
 * Get your API key at: https://aistudio.google.com/apikey
 *
 * Free tier limits (as of 2025):
 * - gemini-2.0-flash: ~15 req/min, 1M tokens/min (may vary by region)
 * - gemini-1.5-flash: ~15 req/min, 1M tokens/min
 * - gemini-1.5-pro: ~2 req/min, 32K tokens/min
 */

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

/**
 * Call Gemini with automatic model fallback.
 * Tries each model in order until one succeeds.
 */
export async function geminiChat(
  prompt: string,
  options?: {
    imageBase64?: string;
    mimeType?: string;
    temperature?: number;
    maxOutputTokens?: number;
    timeout?: number;
  }
): Promise<{ success: boolean; content?: string; model?: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { success: false, error: 'Gemini not configured (missing GEMINI_API_KEY)' };

  const timeout = options?.timeout || 30_000;
  let lastError = '';

  for (const model of GEMINI_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      // Build request body
      const parts: unknown[] = [{ text: prompt }];
      if (options?.imageBase64) {
        parts.push({
          inline_data: {
            mime_type: options.mimeType || 'image/jpeg',
            data: options.imageBase64,
          },
        });
      }

      const response = await fetch(
        `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: options?.temperature ?? 0.2,
              maxOutputTokens: options?.maxOutputTokens ?? 4000,
            },
          }),
          signal: controller.signal,
        }
      ).finally(() => clearTimeout(timer));

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (content && content.length > 10) {
          console.log(`[gemini] ✅ Success with model: ${model}`);
          return { success: true, content, model };
        }
        lastError = `Model ${model} returned empty response`;
        console.warn(`[gemini] Model ${model} returned empty response, trying next...`);
      } else {
        const data = await response.json().catch(() => ({}));
        const errMsg = data.error?.message || `HTTP ${response.status}`;
        lastError = errMsg;

        // If it's a 429 (quota), try next model
        if (response.status === 429) {
          console.warn(`[gemini] Model ${model} quota exceeded, trying next model...`);
          continue;
        }

        // If it's a 400 (model not found), try next model
        if (response.status === 400 || response.status === 404) {
          console.warn(`[gemini] Model ${model} not available, trying next model...`);
          continue;
        }

        // For other errors, still try next model
        console.warn(`[gemini] Model ${model} failed: ${errMsg}, trying next...`);
        continue;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[gemini] Model ${model} error: ${lastError}, trying next...`);
      continue;
    }
  }

  return { success: false, error: `All Gemini models failed. Last error: ${lastError}` };
}
