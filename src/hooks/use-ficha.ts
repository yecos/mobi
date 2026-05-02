'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import type { CopilotFurnitureData, CopilotMessage } from '@/lib/types';
import { toast } from 'sonner';

/**
 * Hook for the main Ficha flow:
 * 1. Analyze image → get CopilotFurnitureData (JS object)
 * 2. Edit data (dimensions, materials, colors, etc.)
 * 3. Review before export
 * 4. Export PDF, SVG, or PNG
 */
export function useFicha() {
  const lang = useAppStore((s) => s.lang);
  const imageBase64 = useAppStore((s) => s.imageBase64);
  const copilotData = useAppStore((s) => s.copilotData);
  const copilotLoading = useAppStore((s) => s.copilotLoading);
  const copilotViewImages = useAppStore((s) => s.copilotViewImages);
  const copilotSheetPdf = useAppStore((s) => s.copilotSheetPdf);
  const copilotSheetSvg = useAppStore((s) => s.copilotSheetSvg);
  const fichaExportLoading = useAppStore((s) => s.fichaExportLoading);

  const setState = useAppStore((s) => s.setState);
  const setCopilotLoading = useAppStore((s) => s.setCopilotLoading);
  const setCopilotData = useAppStore((s) => s.setCopilotData);
  const setCopilotViewImages = useAppStore((s) => s.setCopilotViewImages);
  const setCopilotSheetPdf = useAppStore((s) => s.setCopilotSheetPdf);
  const setCopilotSheetSvg = useAppStore((s) => s.setCopilotSheetSvg);
  const setFichaAiImage = useAppStore((s) => s.setFichaAiImage);
  const setFichaExportLoading = useAppStore((s) => s.setFichaExportLoading);
  const setFichaExportFormat = useAppStore((s) => s.setFichaExportFormat);
  const addCopilotMessage = useAppStore((s) => s.addCopilotMessage);
  const clearCopilotMessages = useAppStore((s) => s.clearCopilotMessages);
  const addAnalysisMessage = useAppStore((s) => s.addAnalysisMessage);
  const clearAnalysisMessages = useAppStore((s) => s.clearAnalysisMessages);

  /**
   * Step 1: Analyze image with the VIVA MOBILI prompt → get JS object + generate ficha image
   */
  const analyzeFicha = useCallback(async () => {
    if (!imageBase64) return;

    setState('analyzing');
    setCopilotLoading(true);
    setCopilotSheetPdf(null);
    setCopilotSheetSvg(null);
    clearCopilotMessages();
    clearAnalysisMessages();

    // Show progress messages
    const isES = lang === 'es';
    const messages = isES
      ? ['Identificando tipo de mobiliario...', 'Extrayendo dimensiones...', 'Analizando materiales y acabado...', 'Detectando características distintivas...', 'Generando ficha técnica VIVA MOBILI...', 'Preparando datos editables y vista previa...']
      : ['Identifying furniture type...', 'Extracting dimensions...', 'Analyzing materials & finish...', 'Detecting distinctive features...', 'Generating VIVA MOBILI product sheet...', 'Preparing editable data & preview...'];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      if (msgIndex < messages.length) {
        addAnalysisMessage(messages[msgIndex]);
        msgIndex++;
      }
    }, 3000);

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

      // Clear progress messages interval
      clearInterval(msgInterval);
      addAnalysisMessage(lang === 'es' ? '¡Análisis completo! Generando vistas...' : 'Analysis complete! Generating views...');

      // Add assistant message
      const assistantMsg: CopilotMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: lang === 'en'
          ? `Analysis complete! I identified a **${furnitureData.style} ${furnitureData.productType}** made of **${furnitureData.material.main}** with a **${furnitureData.finish}** finish.\n\nFeature: ${furnitureData.feature}\nDimensions: ${furnitureData.dimensions.height}×${furnitureData.dimensions.width}×${furnitureData.dimensions.depth} cm${furnitureData.dimensions.seatHeight ? ` (Seat: ${furnitureData.dimensions.seatHeight}cm)` : ''}\n\nThe ficha image is ready! You can now **edit the data** and the preview updates in real-time.`
          : `¡Análisis completo! Identifiqué un **${furnitureData.productType} de estilo ${furnitureData.style}** hecho de **${furnitureData.material.main}** con acabado **${furnitureData.finish}**.\n\nCaracterística: ${furnitureData.feature}\nDimensiones: ${furnitureData.dimensions.height}×${furnitureData.dimensions.width}×${furnitureData.dimensions.depth} cm${furnitureData.dimensions.seatHeight ? ` (Asiento: ${furnitureData.dimensions.seatHeight}cm)` : ''}\n\n¡La ficha imagen está lista! Ahora puedes **editar los datos** y la vista previa se actualiza en tiempo real.`,
        timestamp: Date.now(),
        furnitureData,
      };
      addCopilotMessage(assistantMsg);

      // Show warning if estimated data
      if (analyzeData.isEstimated) {
        toast.warning(
          lang === 'en'
            ? 'AI partially unavailable. Some data is estimated — please verify and edit.'
            : 'IA parcialmente no disponible. Algunos datos son estimados — verifica y edita.',
          { duration: 8000 }
        );
      }

      // Go to ficha editing screen (SVG preview is built client-side in useMemo)
      setState('ficha-editing');

      // Fire-and-forget: generate AI photorealistic views + ficha image in background
      generateViewsInBackground(furnitureData);
      generateFichaImageInBackground(furnitureData);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[ficha] Analysis error:', errorMsg);
      clearInterval(msgInterval);

      const errMsg: CopilotMessage = {
        id: `asst-${Date.now()}-error`,
        role: 'assistant',
        content: lang === 'en'
          ? `Analysis failed: ${errorMsg}. Please try again.`
          : `Error en el análisis: ${errorMsg}. Por favor intenta de nuevo.`,
        timestamp: Date.now(),
      };
      addCopilotMessage(errMsg);

      toast.error(
        lang === 'en'
          ? `Analysis failed: ${errorMsg}`
          : `Error en el análisis: ${errorMsg}`
      );

      setState('upload');
    } finally {
      setCopilotLoading(false);
    }
  }, [imageBase64, lang, setState, setCopilotLoading, setCopilotData, setCopilotSheetPdf, setCopilotSheetSvg, setFichaAiImage, addCopilotMessage, clearCopilotMessages, addAnalysisMessage, clearAnalysisMessages]);

  /**
   * Generate AI photorealistic views in the background (fire-and-forget)
   */
  const generateViewsInBackground = useCallback(async (data: CopilotFurnitureData) => {
    try {
      const res = await fetch('/api/copilot/generate-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ furnitureData: data, views: ['front', 'side', 'top', 'perspective'] }),
      });
      const result = await res.json();
      if (result.success && result.viewImages) {
        setCopilotViewImages(result.viewImages);
      }
    } catch (err) {
      console.warn('[ficha] Background view generation failed:', err);
    }
  }, [setCopilotViewImages]);

  /**
   * Generate AI ficha image in the background (fire-and-forget)
   */
  const generateFichaImageInBackground = useCallback(async (data: CopilotFurnitureData) => {
    try {
      const res = await fetch('/api/copilot/generate-ficha-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ furnitureData: data }),
      });
      const result = await res.json();
      if (result.success && result.image) {
        setFichaAiImage(result.image);
      }
    } catch (err) {
      console.warn('[ficha] Background ficha image generation failed:', err);
    }
  }, [setFichaAiImage]);

  /**
   * Step 2: After editing, go to review screen
   */
  const goToReview = useCallback(() => {
    if (!copilotData) return;
    setState('ficha-review');
  }, [copilotData, setState]);

  /**
   * Step 3: Go back to editing from review
   */
  const goBackToEdit = useCallback(() => {
    setState('ficha-editing');
  }, [setState]);

  /**
   * Step 4: Export as PDF or SVG (with AI views)
   */
  const exportFicha = useCallback(async (format: 'pdf' | 'svg') => {
    if (!copilotData) return;

    setFichaExportLoading(true);
    setFichaExportFormat(format);
    setCopilotSheetPdf(null);
    setCopilotSheetSvg(null);

    try {
      // Generate views in parallel with the sheet
      const [viewsResult, sheetResult, svgResult] = await Promise.all([
        fetch('/api/copilot/generate-views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ furnitureData: copilotData, views: ['front', 'side', 'top', 'perspective'] }),
        }).then(r => r.json()).catch(err => {
          console.warn('[ficha] View generation failed:', err);
          return { success: false, viewImages: {} };
        }),

        format === 'pdf'
          ? fetch('/api/copilot/generate-sheet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ furnitureData: copilotData }),
            }).then(r => r.json()).catch(err => {
              console.warn('[ficha] PDF generation failed:', err);
              return { success: false };
            })
          : Promise.resolve({ success: false }),

        format === 'svg'
          ? fetch('/api/copilot/generate-svg', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ furnitureData: copilotData }),
            }).then(r => r.json()).catch(err => {
              console.warn('[ficha] SVG generation failed:', err);
              return { success: false };
            })
          : Promise.resolve({ success: false }),
      ]);

      // Store view images
      if (viewsResult.success && viewsResult.viewImages) {
        setCopilotViewImages(viewsResult.viewImages);
      }

      // Store and download PDF
      if (format === 'pdf' && sheetResult.success && sheetResult.pdf) {
        setCopilotSheetPdf(sheetResult.pdf);
        const binary = atob(sheetResult.pdf);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VIVA-MOBILI-${copilotData.productType}-sheet.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(
          lang === 'en' ? 'PDF exported successfully!' : '¡PDF exportado exitosamente!'
        );
      }

      // Store and download SVG
      if (format === 'svg' && svgResult.success && svgResult.svg) {
        setCopilotSheetSvg(svgResult.svg);
        const blob = new Blob([svgResult.svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VIVA-MOBILI-${copilotData.productType}-sheet.svg`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(
          lang === 'en' ? 'SVG exported successfully!' : '¡SVG exportado exitosamente!'
        );
      }

      // If primary format failed
      if (format === 'pdf' && !sheetResult.success) {
        toast.error(
          lang === 'en' ? 'PDF generation failed. Try SVG format.' : 'Error generando PDF. Intenta formato SVG.'
        );
      }
      if (format === 'svg' && !svgResult.success) {
        toast.error(
          lang === 'en' ? 'SVG generation failed. Try PDF format.' : 'Error generando SVG. Intenta formato PDF.'
        );
      }

    } catch (error) {
      console.error('[ficha] Export error:', error);
      toast.error(
        lang === 'en'
          ? `Export failed: ${error instanceof Error ? error.message : String(error)}`
          : `Error al exportar: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setFichaExportLoading(false);
      setFichaExportFormat(null);
    }
  }, [copilotData, lang, setFichaExportLoading, setFichaExportFormat, setCopilotViewImages, setCopilotSheetPdf, setCopilotSheetSvg]);

  /**
   * Quick export: generate only SVG/PDF without views (faster)
   */
  const quickExport = useCallback(async (format: 'pdf' | 'svg') => {
    if (!copilotData) return;

    setFichaExportLoading(true);
    setFichaExportFormat(format);

    try {
      if (format === 'svg') {
        const res = await fetch('/api/copilot/generate-svg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ furnitureData: copilotData }),
        });
        const data = await res.json();
        if (data.success && data.svg) {
          setCopilotSheetSvg(data.svg);
          const blob = new Blob([data.svg], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `VIVA-MOBILI-${copilotData.productType}-sheet.svg`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(lang === 'en' ? 'SVG exported!' : '¡SVG exportado!');
        } else {
          toast.error(lang === 'en' ? 'SVG generation failed' : 'Error generando SVG');
        }
      } else {
        const res = await fetch('/api/copilot/generate-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ furnitureData: copilotData }),
        });
        const data = await res.json();
        if (data.success && data.pdf) {
          setCopilotSheetPdf(data.pdf);
          const binary = atob(data.pdf);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `VIVA-MOBILI-${copilotData.productType}-sheet.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(lang === 'en' ? 'PDF exported!' : '¡PDF exportado!');
        } else {
          toast.error(lang === 'en' ? 'PDF generation failed' : 'Error generando PDF');
        }
      }
    } catch (error) {
      toast.error(
        lang === 'en'
          ? `Export failed: ${error instanceof Error ? error.message : String(error)}`
          : `Error al exportar: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setFichaExportLoading(false);
      setFichaExportFormat(null);
    }
  }, [copilotData, lang, setFichaExportLoading, setFichaExportFormat, setCopilotSheetPdf, setCopilotSheetSvg]);

  return {
    copilotData,
    copilotLoading,
    copilotViewImages,
    copilotSheetPdf,
    copilotSheetSvg,
    fichaExportLoading,
    analyzeFicha,
    goToReview,
    goBackToEdit,
    exportFicha,
    quickExport,
  };
}
