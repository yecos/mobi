import { NextResponse } from 'next/server';
import { isOpenAIConfigured, getOpenAIClient } from '@/lib/openai-provider';
import { isAzureConfigured, getAzureOpenAIClient } from '@/lib/azure-openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Test ALL AI providers one by one to see which ones actually work
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // ── Test 1: OpenAI ──
  if (isOpenAIConfigured()) {
    try {
      const client = getOpenAIClient();
      if (client) {
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 5,
        });
        results.openai = { status: 'OK', response: response.choices?.[0]?.message?.content };
      }
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; code?: string };
      results.openai = { status: 'FAILED', error: e.message, code: e.code, httpStatus: e.status };
    }
  } else {
    results.openai = { status: 'NOT CONFIGURED' };
  }

  // ── Test 2: Azure OpenAI ──
  if (isAzureConfigured()) {
    try {
      const client = getAzureOpenAIClient();
      if (client) {
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
        const response = await client.chat.completions.create({
          model: deployment,
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 5,
        });
        results.azure = { status: 'OK', response: response.choices?.[0]?.message?.content, deployment };
      }
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; code?: string };
      results.azure = {
        status: 'FAILED',
        error: e.message,
        code: e.code,
        httpStatus: e.status,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o (default)',
        dalleDeployment: process.env.AZURE_OPENAI_DALLE_DEPLOYMENT || 'dall-e-3 (default)',
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      };
    }
  } else {
    results.azure = { status: 'NOT CONFIGURED' };
  }

  // ── Test 3: Gemini ──
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say OK' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        }
      );
      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        results.gemini = { status: 'OK', response: data.candidates[0].content.parts[0].text };
      } else {
        results.gemini = { status: 'FAILED', httpStatus: response.status, error: data.error?.message || JSON.stringify(data).slice(0, 200) };
      }
    } catch (err) {
      results.gemini = { status: 'FAILED', error: err instanceof Error ? err.message : String(err) };
    }
  } else {
    results.gemini = { status: 'NOT CONFIGURED' };
  }

  // Summary
  const working = Object.entries(results).filter(([, v]) => (v as { status: string }).status === 'OK').map(([k]) => k);

  return NextResponse.json({
    results,
    workingProviders: working,
    totalProviders: Object.keys(results).length,
    workingCount: working.length,
  });
}
