'use client';

import { useCallback, useRef } from 'react';
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

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5_000; // 5s between retries

export function useAnalysis() {
  const lang = useAppStore((s) => s.lang);
  const setState = useAppStore((s) => s.setState);
  const imageBase64 = useAppStore((s) => s.imageBase64);
  const setFurnitureData = useAppStore((s) => s.setFurnitureData);
  const addAnalysisMessage = useAppStore((s) => s.addAnalysisMessage);
  const clearAnalysisMessages = useAppStore((s) => s.clearAnalysisMessages);
  const retryCountRef = useRef(0);

  const doAnalyze = useCallback(async (attempt: number): Promise<void> => {
    if (!imageBase64) {
      toast.error('No image to analyze');
      return;
    }

    if (attempt === 0) {
      setState('analyzing');
      clearAnalysisMessages();
      addAnalysisMessage(t(lang, 'analyzing.extractingDimensions'));
    } else {
      addAnalysisMessage(
        lang === 'en'
          ? `Retrying analysis (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`
          : `Reintentando análisis (intento ${attempt + 1}/${MAX_RETRIES + 1})...`
      );
    }

    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
        signal: AbortSignal.timeout(90_000),
      });

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

        // Show warning if data is estimated (AI providers failed)
        if (data.isEstimated) {
          toast.warning(
            data.warning || (lang === 'en'
              ? 'AI unavailable. Showing estimated dimensions — please edit manually.'
              : 'IA no disponible. Mostrando dimensiones estimadas — edita manualmente.'),
            { duration: 8000 }
          );
        } else {
          toast.success(t(lang, 'toasts.pdfsGenerated').replace('PDFs', 'Analysis'));
        }
        retryCountRef.current = 0;
        return;
      }

      // Non-success response
      const errorCode = data.code || '';
      const isRetryable = data.retryable || resp.status === 429 || resp.status === 502;

      if (isRetryable && attempt < MAX_RETRIES) {
        // Auto-retry with delay
        addAnalysisMessage(
          lang === 'en'
            ? `AI busy, retrying in ${RETRY_DELAY_MS / 1000}s...`
            : `IA ocupada, reintentando en ${RETRY_DELAY_MS / 1000}s...`
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return doAnalyze(attempt + 1);
      }

      // No more retries
      if (data.isEstimated && data.data) {
        // Server returned fallback data — use it
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
        toast.warning(
          data.warning || (lang === 'en'
            ? 'AI unavailable. Showing estimated dimensions — please edit manually.'
            : 'IA no disponible. Mostrando dimensiones estimadas — edita manualmente.'),
          { duration: 8000 }
        );
        return;
      }

      // Complete failure with no fallback data
      const errorMessage = data.error || '';
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
            : 'El análisis tardó demasiado. Inténtalo de nuevo.'
        );
      } else {
        toast.error(errorMessage || t(lang, 'toasts.analysisFailed'));
      }
      setState('upload');
      retryCountRef.current = 0;
    } catch (err: unknown) {
      console.error('Analysis error:', err);
      const msg = err instanceof Error ? err.message : String(err);

      if ((msg.includes('timed out') || msg.includes('TimeoutError') || msg.includes('abort')) && attempt < MAX_RETRIES) {
        addAnalysisMessage(
          lang === 'en'
            ? `Request timed out, retrying in ${RETRY_DELAY_MS / 1000}s...`
            : `Tiempo agotado, reintentando en ${RETRY_DELAY_MS / 1000}s...`
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return doAnalyze(attempt + 1);
      }

      if (msg.includes('timed out') || msg.includes('TimeoutError') || msg.includes('abort')) {
        toast.error(
          lang === 'en'
            ? 'Analysis timed out. The AI servers may be busy — please try again.'
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
      retryCountRef.current = 0;
    }
  }, [imageBase64, lang, setState, setFurnitureData, addAnalysisMessage, clearAnalysisMessages]);

  const handleAnalyze = useCallback(() => {
    retryCountRef.current = 0;
    return doAnalyze(0);
  }, [doAnalyze]);

  return { handleAnalyze };
}
