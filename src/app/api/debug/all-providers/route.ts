import { NextResponse } from 'next/server';
import { isOpenAIConfigured, getOpenAIClient } from '@/lib/openai-provider';
import { isAzureConfigured, getAzureOpenAIClient } from '@/lib/azure-openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Test ALL AI providers one by one to see which ones actually work.
 * Returns detailed status + specific remediation actions for each provider.
 */
export async function GET() {
  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const recommendations: string[] = [];

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
      const e = err as { status?: number; message?: string; code?: string; error?: { code?: string; message?: string } };
      const errorCode = e.code || e.error?.code || '';
      const errorMsg = e.message || e.error?.message || '';

      results.openai = { status: 'FAILED', error: errorMsg, code: errorCode, httpStatus: e.status };

      if (e.status === 429 || errorCode === 'insufficient_quota' || errorMsg.includes('quota')) {
        errors.openai = 'insufficient_quota';
        recommendations.push('OpenAI: Tu cuenta no tiene créditos. Agrega método de pago en https://platform.openai.com/account/billing — Con solo $5 USD puedes generar miles de imágenes.');
      } else if (e.status === 401) {
        errors.openai = 'invalid_api_key';
        recommendations.push('OpenAI: Tu API key es inválida. Genera una nueva en https://platform.openai.com/api-keys');
      } else if (e.status === 429 && errorMsg.includes('rate_limit')) {
        errors.openai = 'rate_limit';
        recommendations.push('OpenAI: Rate limit alcanzado. Espera unos minutos e intenta de nuevo.');
      } else {
        errors.openai = 'unknown';
        recommendations.push(`OpenAI: Error desconocido (${e.status}). Verifica tu API key y cuenta.`);
      }
    }
  } else {
    results.openai = { status: 'NOT CONFIGURED' };
    errors.openai = 'not_configured';
    recommendations.push('OpenAI: No está configurado. Agrega OPENAI_API_KEY=sk-... en las variables de entorno de Vercel o .env');
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
      const errorMsg = e.message || '';

      results.azure = {
        status: 'FAILED',
        error: errorMsg,
        code: e.code,
        httpStatus: e.status,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o (default)',
        dalleDeployment: process.env.AZURE_OPENAI_DALLE_DEPLOYMENT || 'dall-e-3 (default)',
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      };

      if (e.status === 404 || errorMsg.includes('DeploymentNotFound') || errorMsg.includes('does not exist')) {
        errors.azure = 'deployment_not_found';
        const chatDeploy = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o (default)';
        const dalleDeploy = process.env.AZURE_OPENAI_DALLE_DEPLOYMENT || 'dall-e-3 (default)';
        recommendations.push(
          `Azure: Los nombres de deployment NO coinciden. Tienes configurado chat="${chatDeploy}" y dalle="${dalleDeploy}". ` +
          `Ve a Azure Portal → Azure AI Studio → Deployments y verifica los nombres exactos. ` +
          `Luego actualiza las variables AZURE_OPENAI_DEPLOYMENT_NAME y AZURE_OPENAI_DALLE_DEPLOYMENT en Vercel.`
        );
      } else if (e.status === 401 || e.status === 403) {
        errors.azure = 'auth_error';
        recommendations.push('Azure: Error de autenticación. Verifica tu AZURE_OPENAI_API_KEY.');
      } else {
        errors.azure = 'unknown';
        recommendations.push(`Azure: Error (${e.status}). Verifica tu configuración de Azure OpenAI.`);
      }
    }
  } else {
    results.azure = { status: 'NOT CONFIGURED' };
    errors.azure = 'not_configured';
    recommendations.push('Azure: No está configurado. Agrega AZURE_OPENAI_API_KEY y AZURE_OPENAI_ENDPOINT en las variables de entorno.');
  }

  // ── Test 3: Gemini (tries multiple models) ──
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let geminiOk = false;
    const geminiModelResults: Record<string, unknown> = {};

    for (const model of geminiModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
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
          geminiModelResults[model] = { status: 'OK', response: data.candidates[0].content.parts[0].text };
          if (!geminiOk) {
            results.gemini = { status: 'OK', response: data.candidates[0].content.parts[0].text, model };
            geminiOk = true;
          }
        } else {
          geminiModelResults[model] = { status: 'FAILED', httpStatus: response.status, error: (data.error?.message || '').slice(0, 100) };
        }
      } catch (err) {
        geminiModelResults[model] = { status: 'FAILED', error: err instanceof Error ? err.message : String(err) };
      }
    }

    if (!geminiOk) {
      results.gemini = { status: 'FAILED', models: geminiModelResults, error: 'All Gemini models failed' };
      errors.gemini = 'insufficient_quota';
      recommendations.push('Gemini: Todos los modelos (2.0-flash, 1.5-flash, 1.5-pro) fallaron con error 429. Tu API key puede tener restricciones de región. Intenta: 1) Crear key en https://aistudio.google.com/apikey 2) Habilitar billing en https://ai.google.dev/pricing');
    }
  } else {
    results.gemini = { status: 'NOT CONFIGURED' };
    errors.gemini = 'not_configured';
    recommendations.push('Gemini: No está configurado. Agrega GEMINI_API_KEY en las variables de entorno.');
  }

  // ── Summary ──
  const working = Object.entries(results)
    .filter(([, v]) => (v as { status: string }).status === 'OK')
    .map(([k]) => k);

  // ── Priority recommendation ──
  let priorityAction = '';
  if (working.length === 0) {
    if (errors.openai === 'insufficient_quota') {
      priorityAction = 'ACCIÓN INMEDIATA: Agrega créditos a tu cuenta de OpenAI en https://platform.openai.com/account/billing — Con $5 USD puedes usar ChatGPT (GPT-4o Vision + DALL-E 3) para generar fichas técnicas fotorrealistas. Esto es la solución más rápida y económica.';
    } else if (errors.azure === 'deployment_not_found') {
      priorityAction = 'ACCIÓN INMEDIATA: Tu Azure OpenAI está casi funcionando. Solo necesitas corregir los nombres de deployment. Ve a Azure Portal → Azure AI Studio → Deployments y copia los nombres exactos. Luego actualiza AZURE_OPENAI_DEPLOYMENT_NAME y AZURE_OPENAI_DALLE_DEPLOYMENT en Vercel.';
    } else if (errors.openai === 'not_configured') {
      priorityAction = 'ACCIÓN INMEDIATA: Configura al menos un proveedor de IA. La opción más fácil es OpenAI: 1) Crea cuenta en https://platform.openai.com 2) Agrega $5 en billing 3) Genera API key en https://platform.openai.com/api-keys 4) Agrega OPENAI_API_KEY en Vercel Environment Variables.';
    } else {
      priorityAction = 'Ningún proveedor de IA está funcionando. Revisa las recomendaciones específicas abajo para cada proveedor.';
    }
  } else {
    priorityAction = `Proveedores funcionando: ${working.join(', ')}. La app debería funcionar correctamente.`;
  }

  return NextResponse.json({
    results,
    errors,
    workingProviders: working,
    totalProviders: Object.keys(results).length,
    workingCount: working.length,
    recommendations,
    priorityAction,
    nextSteps: working.length === 0
      ? 'La app usará Smart Defaults (datos estimados) hasta que al menos un proveedor de IA esté funcionando. Para fichas fotorrealistas necesitas un proveedor con generación de imágenes (OpenAI DALL-E 3 o Azure DALL-E 3).'
      : undefined,
  });
}
