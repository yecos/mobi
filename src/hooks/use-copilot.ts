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
  const copilotSheetSvg = useAppStore((s) => s.copilotSheetSvg);
  const imageBase64 = useAppStore((s) => s.imageBase64);
  const setCopilotOpen = useAppStore((s) => s.setCopilotOpen);
  const setCopilotLoading = useAppStore((s) => s.setCopilotLoading);
  const addCopilotMessage = useAppStore((s) => s.addCopilotMessage);
  const setCopilotData = useAppStore((s) => s.setCopilotData);
  const setCopilotViewImages = useAppStore((s) => s.setCopilotViewImages);
  const setCopilotSheetPdf = useAppStore((s) => s.setCopilotSheetPdf);
  const setCopilotSheetSvg = useAppStore((s) => s.setCopilotSheetSvg);
  const clearCopilotMessages = useAppStore((s) => s.clearCopilotMessages);
  const setFichaEditMode = useAppStore((s) => s.setFichaEditMode);

  const toggleCopilot = useCallback(() => {
    setCopilotOpen(!copilotOpen);
  }, [copilotOpen, setCopilotOpen]);

  /**
   * Step 1: Analyze image with the custom prompt → get CopilotFurnitureData
   * Does NOT auto-generate views/sheet — user will edit first, then generate.
   */
  const analyzeWithCopilot = useCallback(async () => {
    if (!imageBase64) return;

    setCopilotLoading(true);
    // Clear previous sheet data so we don't show stale downloads
    setCopilotSheetPdf(null);
    setCopilotSheetSvg(null);

    // Add user message
    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: lang === 'en'
        ? 'Analyze this furniture image and generate a VIVA MOBILI product sheet'
        : 'Analiza esta imagen de mobiliario y genera una ficha VIVA MOBILI',
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
          ? `Analysis complete! I identified this as a **${furnitureData.style} ${furnitureData.productType}** made of **${furnitureData.material.main}** with a **${furnitureData.finish}** finish.\n\nDistinctive feature: ${furnitureData.feature}\n\nDimensions: ${furnitureData.dimensions.height}×${furnitureData.dimensions.width}×${furnitureData.dimensions.depth} cm${furnitureData.dimensions.seatHeight ? ` (Seat: ${furnitureData.dimensions.seatHeight}cm)` : ''}\n\nYou can now **edit the data** and then generate the PDF or SVG.`
          : `¡Análisis completo! Identifiqué esto como un **${furnitureData.productType} de estilo ${furnitureData.style}** hecho de **${furnitureData.material.main}** con acabado **${furnitureData.finish}**.\n\nCaracterística distintiva: ${furnitureData.feature}\n\nDimensiones: ${furnitureData.dimensions.height}×${furnitureData.dimensions.width}×${furnitureData.dimensions.depth} cm${furnitureData.dimensions.seatHeight ? ` (Asiento: ${furnitureData.dimensions.seatHeight}cm)` : ''}\n\nAhora puedes **editar los datos** y luego generar el PDF o SVG.`,
        timestamp: Date.now(),
        furnitureData,
      };
      addCopilotMessage(assistantMsg);

      // Auto-enter edit mode after analysis so user can review/edit
      setFichaEditMode(true);

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
  }, [imageBase64, lang, setCopilotLoading, addCopilotMessage, setCopilotData, setCopilotSheetPdf, setCopilotSheetSvg, setFichaEditMode]);

  /**
   * Generate views + sheet PDF + SVG from edited data.
   * Called when user finishes editing and clicks "Generate".
   */
  const generateFromEditedData = useCallback(async (data: CopilotFurnitureData) => {
    setCopilotLoading(true);
    setCopilotSheetPdf(null);
    setCopilotSheetSvg(null);

    try {
      // Generate views, PDF, and SVG in parallel
      const [viewsResult, sheetResult, svgResult] = await Promise.all([
        fetch('/api/copilot/generate-views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ furnitureData: data, views: ['front', 'side', 'top', 'perspective'] }),
        }).then(r => r.json()).catch(err => {
          console.warn('[copilot] View generation failed:', err);
          return { success: false, viewImages: {} };
        }),

        fetch('/api/copilot/generate-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ furnitureData: data }),
        }).then(r => r.json()).catch(err => {
          console.warn('[copilot] Sheet generation failed:', err);
          return { success: false };
        }),

        fetch('/api/copilot/generate-svg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ furnitureData: data }),
        }).then(r => r.json()).catch(err => {
          console.warn('[copilot] SVG generation failed:', err);
          return { success: false };
        }),
      ]);

      if (viewsResult.success && viewsResult.viewImages) {
        setCopilotViewImages(viewsResult.viewImages);
      }

      if (sheetResult.success && sheetResult.pdf) {
        setCopilotSheetPdf(sheetResult.pdf);
      }

      if (svgResult.success && svgResult.svg) {
        setCopilotSheetSvg(svgResult.svg);
      }

      // Add completion message
      const completionMsg: CopilotMessage = {
        id: `asst-${Date.now()}-complete`,
        role: 'assistant',
        content: lang === 'en'
          ? `✅ Product sheet generated with your edits!\n\n${viewsResult.success ? `• ${(viewsResult.generatedCount || 4)} photorealistic views rendered` : '• View rendering skipped'}\n${sheetResult.success ? '• PDF ready for download' : '• PDF generation skipped'}\n${svgResult.success ? '• SVG ready for download' : '• SVG generation skipped'}\n\nYou can continue editing or download the files.`
          : `✅ ¡Ficha de producto generada con tus ediciones!\n\n${viewsResult.success ? `• ${(viewsResult.generatedCount || 4)} vistas fotorrealistas renderizadas` : '• Renderizado de vistas omitido'}\n${sheetResult.success ? '• PDF listo para descargar' : '• Generación de PDF omitida'}\n${svgResult.success ? '• SVG listo para descargar' : '• Generación de SVG omitida'}\n\nPuedes seguir editando o descargar los archivos.`,
        timestamp: Date.now(),
        furnitureData: data,
      };
      addCopilotMessage(completionMsg);

      // Exit edit mode to show results
      setFichaEditMode(false);

      return { viewsResult, sheetResult, svgResult };
    } catch (error) {
      console.error('[copilot] Generation error:', error);
      const errMsg: CopilotMessage = {
        id: `asst-${Date.now()}-error`,
        role: 'assistant',
        content: lang === 'en'
          ? `❌ Generation failed: ${error instanceof Error ? error.message : String(error)}. Please try again.`
          : `❌ Error en la generación: ${error instanceof Error ? error.message : String(error)}. Por favor intenta de nuevo.`,
        timestamp: Date.now(),
      };
      addCopilotMessage(errMsg);
    } finally {
      setCopilotLoading(false);
    }
  }, [lang, setCopilotLoading, setCopilotViewImages, setCopilotSheetPdf, setCopilotSheetSvg, addCopilotMessage, setFichaEditMode]);

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

  const downloadSvg = useCallback(() => {
    if (!copilotSheetSvg) return;
    const blob = new Blob([copilotSheetSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VIVA-MOBILI-${copilotData?.productType || 'furniture'}-sheet.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [copilotSheetSvg, copilotData]);

  return {
    copilotOpen,
    copilotMessages,
    copilotLoading,
    copilotData,
    copilotViewImages,
    copilotSheetPdf,
    copilotSheetSvg,
    toggleCopilot,
    analyzeWithCopilot,
    generateFromEditedData,
    downloadSheet,
    downloadSvg,
    clearCopilotMessages,
    setCopilotOpen,
  };
}
