'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

export function usePdfGeneration() {
  const lang = useAppStore((s) => s.lang);
  const furnitureData = useAppStore((s) => s.furnitureData);
  const setState = useAppStore((s) => s.setState);
  const setMetricPdf = useAppStore((s) => s.setMetricPdf);
  const setImperialPdf = useAppStore((s) => s.setImperialPdf);
  const setCatalogPdf = useAppStore((s) => s.setCatalogPdf);
  const setCombinedPdf = useAppStore((s) => s.setCombinedPdf);
  const catalogItems = useAppStore((s) => s.catalogItems);
  const catalogImages = useAppStore((s) => s.catalogImages);
  const technicalDrawingBase64 = useAppStore((s) => s.technicalDrawingBase64);
  const setTechnicalDrawing = useAppStore((s) => s.setTechnicalDrawing);
  const svgViews = useAppStore((s) => s.svgViews);
  const setSvgViews = useAppStore((s) => s.setSvgViews);
  const setApproved = useAppStore((s) => s.setApproved);

  const downloadPdf = useCallback((base64: string, filename: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const previewPdf = useCallback((base64: string) => {
    const byteCharacters = atob(base64);
    const bytes = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++)
      bytes[i] = byteCharacters.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }, []);

  // Generate AI technical drawing (called once, reused for all PDFs)
  const generateTechnicalDrawing = useCallback(async (): Promise<string | null> => {
    if (technicalDrawingBase64) {
      return technicalDrawingBase64;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const resp = await fetch('/api/generate-drawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ furnitureData }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await resp.json();

      if (data.success && data.svgViews) {
        setSvgViews(data.svgViews);
        if (data.imageBase64) {
          setTechnicalDrawing(data.imageBase64);
        }
        return data.imageBase64 || null;
      } else if (data.success && data.imageBase64) {
        setTechnicalDrawing(data.imageBase64);
        return data.imageBase64;
      } else {
        return null;
      }
    } catch (err) {
      console.warn('[pdf-client] Technical drawing generation error:', err);
      return null;
    }
  }, [furnitureData, technicalDrawingBase64, setTechnicalDrawing, setSvgViews]);

  const handleGeneratePDFs = useCallback(
    async (ultraCompressImage: () => Promise<string | null>) => {
      setState('generating');

      try {
        const compressedImage = await ultraCompressImage();

        // Step 1: Generate AI technical drawing
        await generateTechnicalDrawing();

        // Get the latest svgViews from the store
        const currentSvgViews = useAppStore.getState().svgViews;

        // Step 2: Generate metric PDF
        let metricResult: string | null = null;
        try {
          const metricController = new AbortController();
          const metricTimeout = setTimeout(() => metricController.abort(), 60000);

          const metricResp = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              furnitureData,
              imageBase64: compressedImage,
              unitSystem: 'metric',
              technicalDrawingBase64: null,
              svgViews: currentSvgViews,
            }),
            signal: metricController.signal,
          });

          clearTimeout(metricTimeout);
          const metricData = await metricResp.json();

          if (metricData.success && metricData.pdf) {
            metricResult = metricData.pdf;
            setMetricPdf(metricResult);
          }
        } catch (err) {
          console.error('[pdf-client] Metric PDF error:', err);
        }

        // Step 3: Generate imperial PDF
        let imperialResult: string | null = null;
        try {
          const imperialController = new AbortController();
          const imperialTimeout = setTimeout(() => imperialController.abort(), 60000);

          const imperialResp = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              furnitureData,
              imageBase64: compressedImage,
              unitSystem: 'imperial',
              technicalDrawingBase64: null,
              svgViews: currentSvgViews,
            }),
            signal: imperialController.signal,
          });

          clearTimeout(imperialTimeout);
          const imperialData = await imperialResp.json();

          if (imperialData.success && imperialData.pdf) {
            imperialResult = imperialData.pdf;
            setImperialPdf(imperialResult);
          }
        } catch (err) {
          console.error('[pdf-client] Imperial PDF error:', err);
        }

        if (metricResult || imperialResult) {
          toast.success(t(lang, 'toasts.pdfsGenerated'));
          setState('approving');
        } else {
          toast.error(t(lang, 'toasts.pdfsFailed'));
          setState('editing');
        }
      } catch {
        toast.error(t(lang, 'toasts.pdfsFailed'));
        setState('editing');
      }
    },
    [furnitureData, lang, setState, setMetricPdf, setImperialPdf, generateTechnicalDrawing]
  );

  const handleGenerateCombined = useCallback(
    async (ultraCompressImage: () => Promise<string | null>) => {
      setState('generating');
      try {
        const compressedImage = await ultraCompressImage();
        const techDrawing = await generateTechnicalDrawing();
        const currentSvgViews = useAppStore.getState().svgViews;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        const resp = await fetch('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'combined',
            furnitureData,
            imageBase64: compressedImage,
            technicalDrawingBase64: techDrawing,
            svgViews: currentSvgViews,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const data = await resp.json();

        if (data.success && data.pdf) {
          setCombinedPdf(data.pdf);
          toast.success(t(lang, 'catalog.combinedPdf'));
          setState('approving');
        } else {
          toast.error(data.error || t(lang, 'toasts.pdfsFailed'));
          setState('editing');
        }
      } catch {
        toast.error(t(lang, 'toasts.pdfsServiceFailed'));
        setState('editing');
      }
    },
    [furnitureData, lang, setState, setCombinedPdf, generateTechnicalDrawing]
  );

  const handleGenerateCatalog = useCallback(
    async (ultraCompressImage: () => Promise<string | null>) => {
      setState('generating');
      try {
        const allItems = [...catalogItems, furnitureData];
        const compressedImage = await ultraCompressImage();
        const allImages = [...catalogImages, compressedImage || ''];

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        const resp = await fetch('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'catalog',
            catalogItems: allItems,
            catalogImages: allImages,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const data = await resp.json();

        if (data.success && data.pdf) {
          setCatalogPdf(data.pdf);
          toast.success(t(lang, 'catalog.catalogPdf'));
          setState('approving');
        } else {
          toast.error(data.error || t(lang, 'toasts.pdfsFailed'));
          setState('editing');
        }
      } catch {
        toast.error(t(lang, 'toasts.pdfsServiceFailed'));
        setState('editing');
      }
    },
    [catalogItems, catalogImages, furnitureData, lang, setState, setCatalogPdf]
  );

  // Approve and save project
  // Tries API first, but always succeeds by saving to local store
  const handleApproveAndSave = useCallback(async (): Promise<boolean> => {
    setState('saving');
    try {
      const currentSvgViews = useAppStore.getState().svgViews;
      const fd = useAppStore.getState().furnitureData;

      const dimensionsCm = {
        width: (fd.dimensions.width.feet * 12 + fd.dimensions.width.inches) * 2.54,
        height: (fd.dimensions.height.feet * 12 + fd.dimensions.height.inches) * 2.54,
        depth: (fd.dimensions.depth.feet * 12 + fd.dimensions.depth.inches) * 2.54,
      };

      // Try API save (may fail on Vercel without DB)
      let apiSaved = false;
      try {
        const resp = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fd.productName || 'Untitled Project',
            furnitureType: fd.category || 'furniture',
            description: fd.description || '',
            observations: fd.observations || '',
            dimensions: dimensionsCm,
            shapeProfile: fd.shapeProfile,
            materials: fd.materials,
            svgViews: currentSvgViews,
            unit: 'cm',
          }),
          signal: AbortSignal.timeout(10_000),
        });

        const data = await resp.json();
        apiSaved = data.success === true;
      } catch (apiErr) {
        console.warn('[approve] API save failed (expected on Vercel without DB):', apiErr instanceof Error ? apiErr.message : String(apiErr));
      }

      // Always mark as approved locally regardless of API result
      setApproved(true);

      // Save project to localStorage as well
      try {
        const savedProjects = JSON.parse(localStorage.getItem('mobi-projects') || '[]');
        savedProjects.push({
          id: `proj_${Date.now()}`,
          name: fd.productName || 'Untitled Project',
          furnitureType: fd.category || 'furniture',
          furnitureData: fd,
          svgViews: currentSvgViews,
          savedAt: new Date().toISOString(),
          apiSynced: apiSaved,
        });
        localStorage.setItem('mobi-projects', JSON.stringify(savedProjects));
      } catch {
        // localStorage might be full or unavailable
      }

      if (apiSaved) {
        toast.success(lang === 'en' ? 'Project saved successfully!' : '¡Proyecto guardado exitosamente!');
      } else {
        toast.success(lang === 'en' ? 'Project saved locally!' : '¡Proyecto guardado localmente!');
      }

      setState('complete');
      return true;
    } catch {
      // Even on total failure, mark approved and go to complete
      setApproved(true);
      toast.success(lang === 'en' ? 'Project approved!' : '¡Proyecto aprobado!');
      setState('complete');
      return true;
    }
  }, [lang, setState, setApproved]);

  return {
    downloadPdf,
    previewPdf,
    handleGeneratePDFs,
    handleGenerateCombined,
    handleGenerateCatalog,
    handleApproveAndSave,
  };
}
