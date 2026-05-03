'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import type { CopilotFurnitureData, CopilotMessage } from '@/lib/types';
import { toast } from 'sonner';

/**
 * Hook for the main Ficha flow:
 * 1. Analyze image → get CopilotFurnitureData (JS object) + generate ficha image
 * 2. WAIT for ficha image before going to editor
 * 3. Edit data (dimensions, materials, colors, etc.)
 * 4. Review before export
 * 5. Export PDF, SVG, or PNG
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
   * Step 1: Analyze image → WAIT for ficha image → THEN go to editor
   *
   * The flow is:
   * 1. Call /api/copilot (analysis) → get furniture data JSON
   * 2. Call /api/copilot/generate-ficha-image → get photorealistic ficha image
   * 3. Call /api/copilot/generate-views → get 4 views (in parallel, non-blocking)
   * 4. THEN go to ficha-editing screen with everything ready
   */
  const analyzeFicha = useCallback(async () => {
    if (!imageBase64) return;

    setState('analyzing');
    setCopilotLoading(true);
    setCopilotSheetPdf(null);
    setCopilotSheetSvg(null);
    clearCopilotMessages();
    clearAnalysisMessages();

    // Show progress messages - MORE steps to match the full flow
    const isES = lang === 'es';
    const messages = isES
      ? [
          'Enviando imagen a ChatGPT...',
          'Analizando tipo de mobiliario...',
          'Extrayendo dimensiones y materiales...',
          'Detectando características distintivas...',
          'Generando datos de la ficha técnica...',
          'Creando imagen fotorrealista con IA...',
          'Renderizando vistas del producto...',
          'Preparando ficha editable...',
        ]
      : [
          'Sending image to ChatGPT...',
          'Analyzing furniture type...',
          'Extracting dimensions & materials...',
          'Detecting distinctive features...',
          'Generating product sheet data...',
          'Creating photorealistic image with AI...',
          'Rendering product views...',
          'Preparing editable sheet...',
        ];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      if (msgIndex < messages.length) {
        addAnalysisMessage(messages[msgIndex]);
        msgIndex++;
      }
    }, 4000);

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
      // ═══════════════════════════════════════════════════════════
      // PHASE 1: Analysis (ChatGPT/Z-AI Vision → JSON data)
      // ═══════════════════════════════════════════════════════════
      const analyzeRes = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
        signal: AbortSignal.timeout(120_000),
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

      const provider = analyzeData.provider || 'Unknown';
      console.log(`[ficha] Analysis complete via ${provider}`);

      // Show warning if estimated data — means NO AI provider worked
      if (analyzeData.isEstimated) {
        const noApiKey = analyzeData.provider?.includes('Smart Defaults');
        toast.error(
          noApiKey
            ? (lang === 'en'
                ? 'No AI provider available. Add your OpenAI API key (ChatGPT) in settings to enable AI analysis.'
                : 'No hay proveedor de IA disponible. Agrega tu API key de OpenAI (ChatGPT) en configuración para habilitar el análisis con IA.')
            : (lang === 'en'
                ? 'AI partially unavailable. Some data is estimated — please verify and edit.'
                : 'IA parcialmente no disponible. Algunos datos son estimados — verifica y edita.'),
          { duration: 10000 }
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PHASE 2: Generate ficha image (WAIT for this before going to editor)
      // This is the key step - we DON'T go to editor until the image is ready
      // ═══════════════════════════════════════════════════════════
      addAnalysisMessage(isES
        ? 'Generando imagen fotorrealista de la ficha técnica...'
        : 'Generating photorealistic ficha image...'
      );

      let fichaImageSuccess = false;
      try {
        const fichaImageRes = await fetch('/api/copilot/generate-ficha-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            furnitureData,
            originalImage: imageBase64,
          }),
          signal: AbortSignal.timeout(120_000),
        });

        if (fichaImageRes.ok) {
          const fichaImageResult = await fichaImageRes.json();
          if (fichaImageResult.success && fichaImageResult.image) {
            setFichaAiImage(fichaImageResult.image);
            fichaImageSuccess = true;
            console.log(`[ficha] Ficha image generated via ${fichaImageResult.provider || 'unknown'}`);
          } else {
            console.warn('[ficha] Ficha image generation returned no image:', fichaImageResult.error);
          }
        } else {
          console.warn(`[ficha] Ficha image generation failed: ${fichaImageRes.status}`);
        }
      } catch (fichaImgErr) {
        console.warn('[ficha] Ficha image generation error:', fichaImgErr instanceof Error ? fichaImgErr.message : String(fichaImgErr));
      }

      if (!fichaImageSuccess) {
        toast.error(isES
          ? 'No se pudo generar la imagen de la ficha. Necesitas una API key de OpenAI (ChatGPT) para generar imágenes con IA. Se usará la vista previa SVG.'
          : 'Could not generate ficha image. You need an OpenAI API key (ChatGPT) to generate AI images. SVG preview will be used instead.',
          { duration: 10000 }
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PHASE 3: Generate views (can be in parallel, but we still wait)
      // ═══════════════════════════════════════════════════════════
      addAnalysisMessage(isES
        ? 'Renderizando vistas del producto...'
        : 'Rendering product views...'
      );

      try {
        const viewsRes = await fetch('/api/copilot/generate-views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ furnitureData, views: ['front', 'side', 'top', 'perspective'] }),
          signal: AbortSignal.timeout(120_000),
        });

        if (viewsRes.ok) {
          const viewsResult = await viewsRes.json();
          if (viewsResult.success && viewsResult.viewImages) {
            setCopilotViewImages(viewsResult.viewImages);
            console.log(`[ficha] Generated ${viewsResult.generatedCount || 0} views`);
          }
        }
      } catch (viewsErr) {
        console.warn('[ficha] View generation error:', viewsErr instanceof Error ? viewsErr.message : String(viewsErr));
      }

      // ═══════════════════════════════════════════════════════════
      // PHASE 4: NOW go to the editor — everything is ready!
      // ═══════════════════════════════════════════════════════════
      clearInterval(msgInterval);

      // Add assistant message with results
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

      // FINALLY go to editor — AI has finished all its work
      setState('ficha-editing');

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
  }, [imageBase64, lang, setState, setCopilotLoading, setCopilotData, setFichaAiImage, setCopilotViewImages, addCopilotMessage, clearCopilotMessages, addAnalysisMessage, clearAnalysisMessages]);

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
