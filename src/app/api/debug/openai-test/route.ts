import { NextResponse } from 'next/server';
import { isOpenAIConfigured, getOpenAIClient } from '@/lib/openai-provider';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Direct test of OpenAI API connection
 * Tests if the API key works by making a simple chat completion
 */
export async function GET() {
  const key = process.env.OPENAI_API_KEY;

  // Step 1: Check if key exists
  if (!key) {
    return NextResponse.json({
      step: 'key-check',
      error: 'OPENAI_API_KEY is NOT SET in environment',
    }, { status: 500 });
  }

  // Step 2: Check key format
  const keyInfo = {
    length: key.length,
    startsWithSk: key.startsWith('sk-'),
    first5: key.slice(0, 5),
    last4: key.slice(-4),
  };

  // Step 3: Check isOpenAIConfigured()
  const isConfigured = isOpenAIConfigured();

  // Step 4: Try to create OpenAI client
  let clientCreated = false;
  let clientError = '';
  try {
    const client = getOpenAIClient();
    clientCreated = !!client;
  } catch (err) {
    clientError = err instanceof Error ? err.message : String(err);
  }

  // Step 5: Make a simple test call
  let testCallResult = 'not attempted';
  let testCallError = '';
  if (clientCreated) {
    try {
      const client = getOpenAIClient();
      if (client) {
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
          max_tokens: 5,
        });
        testCallResult = response.choices?.[0]?.message?.content || 'empty response';
      }
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string; code?: string };
      testCallError = JSON.stringify({
        message: errorObj.message || String(err),
        status: errorObj.status,
        code: errorObj.code,
      });
      testCallResult = 'FAILED';
    }
  }

  return NextResponse.json({
    keyInfo,
    isConfigured,
    clientCreated,
    clientError,
    testCallResult,
    testCallError,
  });
}
