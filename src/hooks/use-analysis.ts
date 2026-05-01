'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

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

    const messages = [
      t(lang, 'analyzing.extractingDimensions'),
      t(lang, 'analyzing.identifyingMaterials'),
      t(lang, 'analyzing.analyzingShape'),
      t(lang, 'analyzing.categorizing'),
      t(lang, 'analyzing.generatingSpecs'),
    ];

    // Simulate progress messages
    for (let i = 0; i < messages.length; i++) {
      await new Promise((r) => setTimeout(r, 800));
      addAnalysisMessage(messages[i]);
    }

    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
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
            ...(data.data.dimensions || {}),
          },
          shapeProfile: {
            ...useAppStore.getState().furnitureData.shapeProfile,
            ...(data.data.shapeProfile || {}),
          },
        });
        setState('editing');
        toast.success('Analysis complete!');
      } else {
        toast.error(data.error || t(lang, 'toasts.analysisFailed'));
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
