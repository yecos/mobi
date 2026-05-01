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
        signal: AbortSignal.timeout(60000),
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
          materials: data.data.materials || [],
          colorFinishes: data.data.colorFinishes || [],
          loungeConfigurations: data.data.loungeConfigurations || [],
          tags: data.data.tags || [],
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
        const detail = data.details ? ` — ${data.details}` : '';
        toast.error(`${data.error || t(lang, 'toasts.analysisFailed')}${detail}`);
        setState('upload');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error(t(lang, 'toasts.analysisFailed'));
      setState('upload');
    }
  }, [imageBase64, lang, setState, setFurnitureData, addAnalysisMessage, clearAnalysisMessages]);

  return { handleAnalyze };
}
