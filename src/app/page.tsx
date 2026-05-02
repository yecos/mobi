'use client';

import React, { useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/hooks/use-language';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useAnalysis } from '@/hooks/use-analysis';
import { usePdfGeneration } from '@/hooks/use-pdf-generation';
import { useCatalog } from '@/hooks/use-catalog';
import { useDimensions } from '@/hooks/use-dimensions';
import { useCopilot } from '@/hooks/use-copilot';
import { AppHeader } from '@/components/layout/AppHeader';
import { UploadZone } from '@/components/upload/UploadZone';
import { FeatureCards } from '@/components/upload/FeatureCards';
import { AnalyzingView } from '@/components/analyzing/AnalyzingView';
import { GeneratingView } from '@/components/generating/GeneratingView';
import { EditingView } from '@/components/editing/EditingView';
import { ApprovalView } from '@/components/approval/ApprovalView';
import { CompleteView } from '@/components/complete/CompleteView';
import { HeroSection } from '@/components/showcase/HeroSection';
import { SampleShowcase } from '@/components/showcase/SampleShowcase';
import { HowItWorks } from '@/components/showcase/HowItWorks';
import { CopilotPanel } from '@/components/copilot/CopilotPanel';
import { CheckCircle2, FileText, Plus, RotateCcw, Layers, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FurnitureData } from '@/lib/types';
import { defaultFurnitureData } from '@/lib/types';

export default function Home() {
  // Store
  const appState = useAppStore((s) => s.appState);
  const imagePreview = useAppStore((s) => s.imagePreview);
  const imageFile = useAppStore((s) => s.imageFile);
  const dragActive = useAppStore((s) => s.dragActive);
  const analysisMessages = useAppStore((s) => s.analysisMessages);
  const furnitureData = useAppStore((s) => s.furnitureData);
  const unitMode = useAppStore((s) => s.unitMode);
  const metricPdf = useAppStore((s) => s.metricPdf);
  const imperialPdf = useAppStore((s) => s.imperialPdf);
  const combinedPdf = useAppStore((s) => s.combinedPdf);
  const catalogPdf = useAppStore((s) => s.catalogPdf);
  const catalogItems = useAppStore((s) => s.catalogItems);
  const svgViews = useAppStore((s) => s.svgViews);
  const conceptImageBase64 = useAppStore((s) => s.conceptImageBase64);
  const updateField = useAppStore((s) => s.updateField);
  const setUnitMode = useAppStore((s) => s.setUnitMode);
  const resetAll = useAppStore((s) => s.resetAll);
  const setFurnitureData = useAppStore((s) => s.setFurnitureData);
  const setImagePreview = useAppStore((s) => s.setImagePreview);
  const setImageBase64 = useAppStore((s) => s.setImageBase64);
  const setState = useAppStore((s) => s.setState);

  // Local state for saving indicator
  const [isSaving, setIsSaving] = useState(false);

  // Hooks
  const { lang, toggleLang } = useLanguage();
  const { handleFile, handleDrag, handleDrop, ultraCompressImage, removeImage } = useImageUpload();
  const { handleAnalyze } = useAnalysis();
  const { downloadPdf, previewPdf, handleGeneratePDFs, handleGenerateCombined, handleGenerateCatalog, handleApproveAndSave } = usePdfGeneration();
  const { handleAddToCatalog, handleClearCatalog, catalogCount } = useCatalog();
  const { renderDimensionInput } = useDimensions();
  const { copilotOpen, toggleCopilot } = useCopilot();

  // Ref for scrolling to upload section
  const uploadRef = useRef<HTMLDivElement>(null);
  const scrollToUpload = useCallback(() => {
    uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Load sample data for demo
  const handleLoadSample = useCallback((data: FurnitureData) => {
    setFurnitureData({
      ...defaultFurnitureData,
      ...data,
      dimensions: {
        ...defaultFurnitureData.dimensions,
        ...data.dimensions,
      },
    });
    const placeholderSvg = `data:image/svg+xml;base64,${btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#f5f5f4" width="400" height="300"/><text fill="#a8a29e" font-family="sans-serif" font-size="16" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">Sample Furniture Preview</text></svg>'
    )}`;
    setImagePreview(placeholderSvg);
    setImageBase64(placeholderSvg);
    setState('editing');
  }, [setFurnitureData, setImagePreview, setImageBase64, setState]);

  // Approve handler: save project then go to complete
  const onApprove = useCallback(async () => {
    setIsSaving(true);
    await handleApproveAndSave();
    setIsSaving(false);
  }, [handleApproveAndSave]);

  // Reject handler: go back to editing
  const onReject = useCallback(() => {
    setState('editing');
  }, [setState]);

  // STATE: Upload
  if (appState === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex flex-col">
        <AppHeader
          lang={lang}
          onToggleLang={toggleLang}
          showCatalogBadge={true}
          catalogCount={catalogItems.length}
          onToggleCopilot={toggleCopilot}
          copilotOpen={copilotOpen}
          actions={
            <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200">
              <Layers className="w-3 h-3 mr-1" />
              {t(lang, 'header.aiPowered')}
            </Badge>
          }
        />

        {/* Hero */}
        <HeroSection lang={lang} onScrollToUpload={scrollToUpload} />

        {/* How It Works */}
        <HowItWorks lang={lang} />

        {/* Sample Showcase */}
        <SampleShowcase lang={lang} onLoadSample={handleLoadSample} />

        {/* Upload Section */}
        <div ref={uploadRef} className="scroll-mt-20">
          <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16">
            <div className="max-w-2xl w-full">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 mb-4">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    {lang === 'en' ? 'Start Your Analysis' : 'Comienza Tu Análisis'}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-3">
                  {lang === 'en' ? 'Upload Your' : 'Sube Tu'}
                  <br />
                  <span className="text-amber-800">{lang === 'en' ? 'Furniture Photo' : 'Foto de Mobiliario'}</span>
                </h2>
                <p className="text-stone-500 text-base max-w-md mx-auto">
                  {t(lang, 'upload.description')}
                </p>
              </div>
              <UploadZone
                imagePreview={imagePreview}
                imageFile={imageFile}
                dragActive={dragActive}
                onDrag={handleDrag}
                onDrop={handleDrop}
                onFileSelect={handleFile}
                onRemoveImage={removeImage}
                onAnalyze={handleAnalyze}
                lang={lang}
              />
              <FeatureCards lang={lang} />
            </div>
          </main>
        </div>
        <CopilotPanel />
      </div>
    );
  }

  // STATE: Analyzing
  if (appState === 'analyzing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex flex-col">
        <AppHeader lang={lang} onToggleLang={toggleLang} onToggleCopilot={toggleCopilot} copilotOpen={copilotOpen} />
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6">
          <div className="max-w-lg w-full">
            <AnalyzingView imagePreview={imagePreview} messages={analysisMessages} lang={lang} />
          </div>
        </main>
        <CopilotPanel />
      </div>
    );
  }

  // STATE: Editing
  if (appState === 'editing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex flex-col">
        <AppHeader
          lang={lang}
          onToggleLang={toggleLang}
          title={t(lang, 'editing.title')}
          subtitle={t(lang, 'editing.subtitle')}
          showCatalogBadge={true}
          catalogCount={catalogItems.length}
          onToggleCopilot={toggleCopilot}
          copilotOpen={copilotOpen}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddToCatalog(ultraCompressImage)}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t(lang, 'catalog.addToCatalog')}
              </Button>
              <Button variant="outline" size="sm" onClick={resetAll} className="text-stone-600">
                <RotateCcw className="w-4 h-4 mr-1" />
                {t(lang, 'editing.startOver')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-800 hover:bg-amber-50"
                onClick={() => handleGenerateCombined(ultraCompressImage)}
              >
                <FileText className="w-4 h-4 mr-1" />
                {t(lang, 'complete.combinedVersion')}
              </Button>
              {catalogItems.length > 0 && (
                <Button
                  size="sm"
                  className="bg-green-800 hover:bg-green-900 text-white"
                  onClick={() => handleGenerateCatalog(ultraCompressImage)}
                >
                  <Layers className="w-4 h-4 mr-1" />
                  {t(lang, 'catalog.generateCatalog')}
                </Button>
              )}
              <Button
                size="sm"
                className="bg-amber-800 hover:bg-amber-900 text-white"
                onClick={() => handleGeneratePDFs(ultraCompressImage)}
              >
                <FileText className="w-4 h-4 mr-1" />
                {t(lang, 'editing.generatePdfs')}
              </Button>
            </>
          }
        />
        <EditingView
          furnitureData={furnitureData}
          imagePreview={imagePreview}
          lang={lang}
          unitMode={unitMode}
          catalogCount={catalogCount}
          onUpdateField={updateField}
          onSetUnitMode={setUnitMode}
          onAddToCatalog={() => handleAddToCatalog(ultraCompressImage)}
          onStartOver={resetAll}
          onGeneratePDFs={() => handleGeneratePDFs(ultraCompressImage)}
          onGenerateCombined={() => handleGenerateCombined(ultraCompressImage)}
          onGenerateCatalog={() => handleGenerateCatalog(ultraCompressImage)}
          renderDimensionInput={renderDimensionInput}
        />
        <CopilotPanel />
      </div>
    );
  }

  // STATE: Generating
  if (appState === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex flex-col">
        <AppHeader
          lang={lang}
          onToggleLang={toggleLang}
          title={t(lang, 'generating.title')}
          onToggleCopilot={toggleCopilot}
          copilotOpen={copilotOpen}
        />
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6">
          <GeneratingView lang={lang} />
        </main>
        <CopilotPanel />
      </div>
    );
  }

  // STATE: Approving
  if (appState === 'approving' || appState === 'saving') {
    const isSavingState = appState === 'saving';
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex flex-col">
        <AppHeader
          lang={lang}
          onToggleLang={toggleLang}
          title={t(lang, 'approval.title')}
          subtitle={t(lang, 'approval.subtitle')}
          onToggleCopilot={toggleCopilot}
          copilotOpen={copilotOpen}
          actions={
            <Button variant="outline" size="sm" onClick={resetAll} className="text-stone-600">
              <RotateCcw className="w-4 h-4 mr-1" />
              {t(lang, 'editing.startOver')}
            </Button>
          }
        />
        {isSavingState ? (
          <main className="flex-1 flex items-center justify-center px-4 sm:px-6">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-amber-700 animate-spin mx-auto mb-4" />
              <p className="text-stone-600 font-medium">
                {lang === 'en' ? 'Saving project...' : 'Guardando proyecto...'}
              </p>
            </div>
          </main>
        ) : (
          <ApprovalView
            furnitureData={furnitureData}
            svgViews={svgViews}
            lang={lang}
            onApprove={onApprove}
            onReject={onReject}
            isSaving={isSaving}
            conceptImageBase64={conceptImageBase64}
          />
        )}
        <CopilotPanel />
      </div>
    );
  }

  // STATE: Complete
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex flex-col">
      <AppHeader
        lang={lang}
        onToggleLang={toggleLang}
        title={t(lang, 'complete.pdfsGenerated')}
        subtitle={t(lang, 'complete.sheetsReady')}
        variant="success"
        onToggleCopilot={toggleCopilot}
        copilotOpen={copilotOpen}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={resetAll} className="text-stone-600">
              <RotateCcw className="w-4 h-4 mr-1" />
              {t(lang, 'editing.startOver')}
            </Button>
          </>
        }
      />
      <CompleteView
        metricPdf={metricPdf}
        imperialPdf={imperialPdf}
        combinedPdf={combinedPdf}
        catalogPdf={catalogPdf}
        furnitureData={furnitureData}
        svgViews={svgViews}
        catalogCount={catalogItems.length}
        onDownload={downloadPdf}
        onPreview={previewPdf}
        onEditSpecs={() => useAppStore.getState().setState('editing')}
        onNewAnalysis={resetAll}
        lang={lang}
      />
      <CopilotPanel />
    </div>
  );
}
