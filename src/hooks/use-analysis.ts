'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

/** Ensure all dimension values have feet/inches as numbers */
function normalizeDimensions(dims: Record<string, unknown> | undefined): Record<string, { feet: number; inches: number }> {
  if (!dims) return {};
  const result: Record<string, { feet: number; inches: number }> = {};
  for (const [key, val] of Object.entries(dims)) {
    if (val && typeof val === 'object' && 'feet' in val && 'inches' in val) {
      const d = val as { feet: unknown; inches: unknown };
      result[key] = {
        feet: typeof d.feet === 'number' ? d.feet : Number(d.feet) || 0,
        inches: typeof d.inches === 'number' ? d.inches : Number(d.inches) || 0,
      };
    }
  }
  return result;
}

export function useAnalysis() {
  const lang = useAppStore((s) => s.lang);
  const setState = useAppStore((s) => s.setState);
  const imageBase64 = useAppStore((s) => s.imageBase64);
  const setFurnitureData = useAppStore((s) => s.setFurnitureData);
  const addAnalysisMessage = useAppStore((s) => s.addAnalysisMessage);
  const clearAnalysisMessages = useAppStore((s) => s.clearAnalysisMessages);

  const handleAnalyze = useCallback(async () => {
    if (!imageBase64) {
      toast.error('No image to analyze');
      return;
    }

    setState('analyzing');
    clearAnalysisMessages();
    addAnalysisMessage(t(lang, 'analyzing.extractingDimensions'));

    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
        signal: AbortSignal.timeout(90_000), // 90s client timeout
      });

      // Handle non-OK responses gracefully
      if (!resp.ok) {
        let errorData: { error?: string; code?: string; details?: string } = {};
        try {
          errorData = await resp.json();
        } catch {
          // Response wasn't JSON
        }

        const errorCode = errorData.code || '';
        const errorMessage = errorData.error || '';

        if (errorCode === 'RATE_LIMITED' || resp.status === 429) {
          toast.error(
            lang === 'en'
              ? 'AI service is busy. Please wait 30 seconds and try again.'
              : 'Servicio de IA ocupado. Espera 30 segundos e inténtalo de nuevo.'
          );
        } else if (errorCode === 'TIMEOUT' || resp.status === 504) {
          toast.error(
            lang === 'en'
              ? 'Analysis timed out. The servers may be busy — please try again.'
              : 'El análisis tardó demasiado. Los servidores pueden estar ocupados — inténtalo de nuevo.'
          );
        } else if (errorCode === 'NO_PROVIDERS') {
          toast.error(
            lang === 'en'
              ? 'AI providers not configured. Contact support.'
              : 'Proveedores de IA no configurados. Contacta soporte.'
          );
        } else {
          const detail = errorMessage ? ` — ${errorMessage}` : '';
          toast.error(`${t(lang, 'toasts.analysisFailed')}${detail}`);
        }
        setState('upload');
        return;
      }

      const data = await resp.json();

      if (data.success && data.data) {
        setFurnitureData({
          ...useAppStore.getState().furnitureData,
          productName: data.data.productName || '',
          brand: data.data.brand || 'Unknown',
          referenceNumber: data.data.referenceNumber || 'N/A',
          description: data.data.description || '',
          descriptionEs: data.data.descriptionEs || '',
          category: data.data.category || 'sofa',
          materials: Array.isArray(data.data.materials) ? data.data.materials.map((m: unknown) =>
            typeof m === 'string' ? { material: m, quantity: 1, description: '', observations: '' } : m
          ) : [],
          colorFinishes: data.data.colorFinishes || [],
          loungeConfigurations: data.data.loungeConfigurations || [],
          tags: data.data.tags || [],
          observations: data.data.observations || '',
          dimensions: {
            ...useAppStore.getState().furnitureData.dimensions,
            ...normalizeDimensions(data.data.dimensions),
          },
          shapeProfile: {
            ...useAppStore.getState().furnitureData.shapeProfile,
            ...(data.data.shapeProfile || {}),
          },
        });
        setState('editing');
        toast.success(t(lang, 'toasts.pdfsGenerated').replace('PDFs', 'Analysis'));
      } else {
        const errorCode = data.code || '';
        const errorMessage = data.error || '';

        if (errorCode === 'RATE_LIMITED') {
          toast.error(
            lang === 'en'
              ? 'AI service rate limit reached. Please wait 30 seconds and try again.'
              : 'Límite de uso alcanzado. Espera 30 segundos e inténtalo de nuevo.'
          );
        } else if (errorCode === 'TIMEOUT') {
          toast.error(
            lang === 'en'
              ? 'Analysis timed out. Please try again in a moment.'
              : 'El análisis tardó demasiado. Inténtalo de nuevo en un momento.'
          );
        } else {
          const detail = data.details ? ` — ${data.details.substring(0, 80)}` : '';
          toast.error(`${errorMessage || t(lang, 'toasts.analysisFailed')}${detail}`);
        }
        setState('upload');
      }
    } catch (err: unknown) {
      console.error('Analysis error:', err);
      const msg = err instanceof Error ? err.message : String(err);

      // Detect timeout vs other errors
      if (msg.includes('timed out') || msg.includes('TimeoutError') || msg.includes('abort')) {
        toast.error(
          lang === 'en'
            ? 'Analysis timed out. The AI servers may be busy — please try again in a moment.'
            : 'El análisis tardó demasiado. Los servidores pueden estar ocupados — inténtalo de nuevo.'
        );
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        toast.error(
          lang === 'en'
            ? 'Network error. Check your connection and try again.'
            : 'Error de red. Verifica tu conexión e inténtalo de nuevo.'
        );
      } else {
        toast.error(t(lang, 'toasts.analysisFailed'));
      }
      setState('upload');
    }
  }, [imageBase64, lang, setState, setFurnitureData, addAnalysisMessage, clearAnalysisMessages]);

  return { handleAnalyze };
}
