import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to check AI provider configuration
 * Only shows partial key info for security
 */
export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const zaiBaseUrl = process.env.ZAI_BASE_URL;
  const zaiApiKey = process.env.ZAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const azureKey = process.env.AZURE_OPENAI_API_KEY;

  const maskKey = (key: string | undefined): string => {
    if (!key) return 'NOT SET';
    if (key.length <= 8) return `${key.slice(0, 3)}***`;
    return `${key.slice(0, 5)}...${key.slice(-4)}`;
  };

  // Check OpenAI key validity
  let openaiStatus = 'NOT SET';
  if (openaiKey) {
    const placeholders = ['your-openai-api-key-here', 'sk-your-key', 'xxx', 'placeholder', 'test'];
    if (placeholders.includes(openaiKey.toLowerCase().trim())) {
      openaiStatus = 'PLACEHOLDER (invalid)';
    } else if (!openaiKey.startsWith('sk-') && openaiKey.length < 20) {
      openaiStatus = `INVALID (doesn't start with sk- and too short: ${openaiKey.length} chars)`;
    } else {
      openaiStatus = `VALID (starts with ${openaiKey.slice(0, 3)}-, length: ${openaiKey.length})`;
    }
  }

  const isVercel = !!(process.env.VERCEL || process.env.VERCEL_URL);

  return NextResponse.json({
    environment: isVercel ? 'Vercel (production)' : 'Local/Dev',
    providers: {
      openai: {
        apiKey: maskKey(openaiKey),
        status: openaiStatus,
        model: process.env.OPENAI_MODEL || 'gpt-4o (default)',
        visionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4o (default)',
        imageModel: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3 (default)',
      },
      zai: {
        baseUrl: zaiBaseUrl || 'NOT SET',
        apiKey: maskKey(zaiApiKey),
        reachable: zaiBaseUrl?.includes('172.') && isVercel ? 'NO (internal IP from Vercel)' : 'Maybe',
      },
      gemini: {
        apiKey: maskKey(geminiKey),
      },
      azure: {
        apiKey: maskKey(azureKey),
        endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'NOT SET',
      },
    },
    recommendation: !openaiKey || openaiStatus !== 'VALID'
      ? 'Add OPENAI_API_KEY=sk-... in Vercel environment variables. This is the ONLY provider that works from Vercel.'
      : 'OpenAI is configured. If it still fails, check the key is valid and has credits.',
  }, { status: 200 });
}
