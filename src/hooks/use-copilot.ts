'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import type { CopilotMessage, CopilotFurnitureData } from '@/lib/types';

export function useCopilot() {
  const lang = useAppStore((s) => s.lang);
  const copilotOpen = useAppStore((s) => s.copilotOpen);
  const copilotMessages = useAppStore((s) => s.copilotMessages);
  const copilotLoading = useAppStore((s) => s.copilotLoading);
  const copilotData = useAppStore((s) => s.copilotData);
  const copilotViewImages = useAppStore((s) => s.copilotViewImages);
  const copilotSheetPdf = useAppStore((s) => s.copilotSheetPdf);
  const imageBase64 = useAppStore((s) => s.imageBase64);
  const setCopilotOpen = useAppStore((s) => s.setCopilotOpen);
  const setCopilotLoading = useAppStore((s) => s.setCopilotLoading);
  const addCopilotMessage = useAppStore((s) => s.addCopilotMessage);
  const setCopilotData = useAppStore((s) => s.setCopilotData);
  const setCopilotViewImages = useAppStore((s) => s.setCopilotViewImages);
  const setCopilotSheetPdf = useAppStore((s) => s.setCopilotSheetPdf);
  const clearCopilotMessages = useAppStore((s) => s.clearCopilotMessages);

  const toggleCopilot = useCallback(() => {
    setCopilotOpen(!copilotOpen);
  }, [copilotOpen, setCopilotOpen]);

  const analyzeWithCopilot = useCallback(async () => {
    if (!imageBase64) return;

    setCopilotLoading(true);

    // Add user message
    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: lang === 'en' ? 'Analyze this furniture image and generate a VIVA MOBILI product sheet' : 'Analiza esta imagen de mobiliario y genera una ficha VIVA MOBILI',
      timestamp: Date.now(),
      imageData: imageBase64,
    };
    addCopilotMessage(userMsg);

    try {
      // Step 1: Analyze image
      const analyzeRes = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
        signal: AbortSignal.timeout(90_000),
      });

      if (!analyzeRes.ok) {
        throw new Error(`Analysis failed: ${analyzeRes.status}`);
      }

      const analyzeData = await analyzeRes.json();
      if (!analyzeData.success || !analyzeData.data) {
        throw new Error('Analysis returned no data');
      }

      const furnitureData = analyzeData.data as CopilotFurnitureData;
      setCopilotData(furnitureData);

      // Add assistant message with extracted data
      const assistantMsg: CopilotMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: lang === 'en'
          ? `Analysis complete! I identified this as a **${furnitureData.style} ${furnitureData.productType}** made of **${furnitureData.material.main}** with a **${furnitureData.finish}** finish.\n\nDistinctive feature: ${furnitureData.feature}\n\nDimensions: ${furnitureData.dimensions.height}×${furnitureData.dimensions.width}×${furnitureData.dimensions.depth} cm${furnitureData.dimensions.seatHeight ? ` (Seat: ${furnitureData.dimensions.seatHeight}cm)` : ''}\n\nGenerating photorealistic views and product sheet...`
          : `¡Análisis completo! Identifiqué esto como un **${furnitureData.productType} de estilo ${furnitureData.style}** hecho de **${furnitureData.material.main}** con acabado **${furnitureData.finish}**.\n\nCaracterística distintiva: ${furnitureData.feature}\n\nDimensiones: ${furnitureData.dimensions.height}×${furnitureData.dimensions.width}×${furnitureData.dimensions.depth} cm${furnitureData.dimensions.seatHeight ? ` (Asiento: ${furnitureData.dimensions.seatHeight}cm)` : ''}\n\nGenerando vistas fotorrealistas y ficha de producto...`,
        timestamp: Date.now(),
        furnitureData,
      };
      addCopilotMessage(assistantMsg);

      // Step 2: Generate photorealistic views (parallel with sheet)
      const viewsPromise = fetch('/api/copilot/generate-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ furnitureData, views: ['front', 'side', 'top', 'perspective'] }),
      }).then(r => r.json()).catch(err => {
        console.warn('[copilot] View generation failed:', err);
        return { success: false, viewImages: {} };
      });

      // Step 3: Generate product sheet PDF
      const sheetPromise = fetch('/api/copilot/generate-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ furnitureData }),
      }).then(r => r.json()).catch(err => {
        console.warn('[copilot] Sheet generation failed:', err);
        return { success: false };
      });

      const [viewsResult, sheetResult] = await Promise.all([viewsPromise, sheetPromise]);

      if (viewsResult.success && viewsResult.viewImages) {
        setCopilotViewImages(viewsResult.viewImages);
      }

      if (sheetResult.success && sheetResult.pdf) {
        setCopilotSheetPdf(sheetResult.pdf);
      }

      // Add completion message
      const completionMsg: CopilotMessage = {
        id: `asst-${Date.now()}-complete`,
        role: 'assistant',
        content: lang === 'en'
          ? `✅ Product sheet generated!\n\n${viewsResult.success ? `• ${viewsResult.generatedCount || 4} photorealistic views rendered` : '• View rendering skipped'}\n${sheetResult.success ? '• VIVA MOBILI product sheet PDF ready' : '• PDF generation skipped'}\n\nYou can download the PDF or view the rendered images below.`
          : `✅ ¡Ficha de producto generada!\n\n${viewsResult.success ? `• ${(viewsResult.generatedCount || 4)} vistas fotorrealistas renderizadas` : '• Renderizado de vistas omitido'}\n${sheetResult.success ? '• Ficha PDF VIVA MOBILI lista' : '• Generación de PDF omitida'}\n\nPuedes descargar el PDF o ver las imágenes renderizadas abajo.`,
        timestamp: Date.now(),
        furnitureData,
      };
      addCopilotMessage(completionMsg);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[copilot] Error:', errorMsg);

      const errMsg: CopilotMessage = {
        id: `asst-${Date.now()}-error`,
        role: 'assistant',
        content: lang === 'en'
          ? `❌ Analysis failed: ${errorMsg}. Please try again.`
          : `❌ Error en el análisis: ${errorMsg}. Por favor intenta de nuevo.`,
        timestamp: Date.now(),
      };
      addCopilotMessage(errMsg);
    } finally {
      setCopilotLoading(false);
    }
  }, [imageBase64, lang, setCopilotLoading, addCopilotMessage, setCopilotData, setCopilotViewImages, setCopilotSheetPdf]);

  const generateSheetFromExistingData = useCallback(async (data: CopilotFurnitureData) => {
    setCopilotLoading(true);
    try {
      const [viewsResult, sheetResult] = await Promise.all([
        fetch('/api/copilot/generate-views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ furnitureData: data, views: ['front', 'side', 'top', 'perspective'] }),
        }).then(r => r.json()).catch(() => ({ success: false, viewImages: {} })),

        fetch('/api/copilot/generate-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ furnitureData: data }),
        }).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (viewsResult.success && viewsResult.viewImages) {
        setCopilotViewImages(viewsResult.viewImages);
      }
      if (sheetResult.success && sheetResult.pdf) {
        setCopilotSheetPdf(sheetResult.pdf);
      }

      return { viewsResult, sheetResult };
    } finally {
      setCopilotLoading(false);
    }
  }, [setCopilotLoading, setCopilotViewImages, setCopilotSheetPdf]);

  const downloadSheet = useCallback(() => {
    if (!copilotSheetPdf) return;
    const binary = atob(copilotSheetPdf);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VIVA-MOBILI-${copilotData?.productType || 'furniture'}-sheet.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [copilotSheetPdf, copilotData]);

  return {
    copilotOpen,
    copilotMessages,
    copilotLoading,
    copilotData,
    copilotViewImages,
    copilotSheetPdf,
    toggleCopilot,
    analyzeWithCopilot,
    generateSheetFromExistingData,
    downloadSheet,
    clearCopilotMessages,
    setCopilotOpen,
  };
}
