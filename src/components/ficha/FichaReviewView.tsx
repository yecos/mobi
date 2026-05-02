'use client';

import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { useFicha } from '@/hooks/use-ficha';
import { buildFichaSvg, svgToDataUrl } from '@/lib/ficha-svg-builder';
import {
  ArrowLeft,
  Download,
  FileText,
  FileImage,
  Loader2,
  Ruler,
  Palette,
  Layers,
  Sparkles,
  Tag,
  CheckCircle2,
  AlertCircle,
  Eye,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CopilotFurnitureData } from '@/lib/types';

interface FichaReviewViewProps {
  lang: string;
}

export function FichaReviewView({ lang }: FichaReviewViewProps) {
  const copilotData = useAppStore((s) => s.copilotData);
  const fichaExportLoading = useAppStore((s) => s.fichaExportLoading);
  const fichaExportFormat = useAppStore((s) => s.fichaExportFormat);
  const copilotViewImages = useAppStore((s) => s.copilotViewImages);
  const fichaAiImage = useAppStore((s) => s.fichaAiImage);
  const resetAll = useAppStore((s) => s.resetAll);
  const { goBackToEdit, exportFicha } = useFicha();

  const isES = lang === 'es';
  const [previewZoom, setPreviewZoom] = useState(0.65);
  const [downloadingImage, setDownloadingImage] = useState(false);

  // Live SVG preview
  const fichaSvg = useMemo(() => {
    if (!copilotData) return null;
    return buildFichaSvg(copilotData);
  }, [copilotData]);

  const fichaDataUrl = useMemo(() => {
    if (!fichaSvg) return null;
    return svgToDataUrl(fichaSvg);
  }, [fichaSvg]);

  // JS code for display
  const jsCode = useMemo(() => {
    if (!copilotData) return '';
    return `export const furnitureData = ${JSON.stringify(copilotData, null, 2)};`;
  }, [copilotData]);

  // Download ficha as PNG image
  const downloadAsImage = React.useCallback(async () => {
    if (!fichaSvg || !fichaDataUrl) return;
    setDownloadingImage(true);
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 794 * 2;
        canvas.height = 1123 * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, 794, 1123);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `VIVA-MOBILI-${copilotData?.productType || 'ficha'}-sheet.png`;
          a.click();
          URL.revokeObjectURL(url);
          setDownloadingImage(false);
        }, 'image/png');
      };
      img.onerror = () => setDownloadingImage(false);
      img.src = fichaDataUrl;
    } catch {
      setDownloadingImage(false);
    }
  }, [fichaSvg, fichaDataUrl, copilotData]);

  if (!copilotData) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">
              {isES ? 'Revisar Ficha Técnica' : 'Review Technical Sheet'}
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              {isES ? 'Verifica que todo esté correcto antes de exportar' : 'Verify everything is correct before exporting'}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            VIVA MOBILI
          </Badge>
        </div>

        {/* Main: 2 columns — SVG Preview | Checklist + JS Data */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: SVG Preview */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Preview Header */}
              <div
                className="px-6 py-2 flex items-center justify-between"
                style={{ backgroundColor: copilotData.colorPalette.primary }}
              >
                <span className="text-sm font-bold text-white">VIVA MOBILI</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => setPreviewZoom(Math.max(0.3, previewZoom - 0.1))}
                  >
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <span className="text-[10px] text-white/70 w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => setPreviewZoom(Math.min(1, previewZoom + 0.1))}
                  >
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* SVG Preview */}
              <div className="p-4 bg-stone-100 overflow-auto" style={{ maxHeight: '80vh' }}>
                {fichaDataUrl ? (
                  <div
                    style={{
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top left',
                      width: `${794 * previewZoom}px`,
                    }}
                  >
                    <img
                      src={fichaDataUrl}
                      alt="Ficha Preview"
                      className="shadow-lg rounded border border-gray-200"
                      style={{ width: 794, height: 1123 }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-400">
                    {isES ? 'Generando vista previa...' : 'Generating preview...'}
                  </div>
                )}
              </div>
            </div>

            {/* AI View Images */}
            {Object.values(copilotViewImages).some(Boolean) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  {isES ? 'Vistas Generadas por IA' : 'AI Generated Views'}
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(copilotViewImages).map(([key, img]) =>
                    img ? (
                      <div key={key} className="rounded-lg overflow-hidden border border-gray-200">
                        <img src={`data:image/png;base64,${img}`} alt={key} className="w-full h-32 object-cover" />
                        <div className="bg-gray-50 py-1 text-center">
                          <span className="text-[9px] font-medium text-gray-500 uppercase">{key}</span>
                        </div>
                      </div>
                    ) : (
                      <div key={key} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100 h-32 flex items-center justify-center">
                        <span className="text-[10px] text-gray-300 uppercase">{key}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* AI Generated Ficha Image */}
            {fichaAiImage && (
              <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                      {isES ? 'Ficha Generada por IA' : 'AI Generated Sheet'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = `data:image/png;base64,${fichaAiImage}`;
                      a.download = `VIVA-MOBILI-${copilotData?.productType || 'ficha'}-ai-sheet.png`;
                      a.click();
                    }}
                  >
                    <Download className="w-3 h-3" />
                    PNG
                  </Button>
                </div>
                <div className="p-3">
                  <img
                    src={`data:image/png;base64,${fichaAiImage}`}
                    alt="AI Generated Ficha"
                    className="w-full rounded-lg border border-gray-200 shadow-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Checklist + JS Data */}
          <div className="lg:col-span-4 space-y-4">
            {/* Verification Checklist */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                {isES ? 'Lista de Verificación' : 'Verification Checklist'}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                <CheckItem label={isES ? 'Dimensiones correctas (cm)' : 'Dimensions correct (cm)'} data={copilotData.dimensions.height > 0} />
                <CheckItem label={isES ? 'Material principal definido' : 'Main material defined'} data={!!copilotData.material.main} />
                <CheckItem label={isES ? 'Acabado especificado' : 'Finish specified'} data={!!copilotData.finish} />
                <CheckItem label={isES ? 'Característica distintiva' : 'Distinctive feature'} data={!!copilotData.feature} />
                <CheckItem label={isES ? 'Paleta de colores válida' : 'Valid color palette'} data={copilotData.colorPalette.primary.startsWith('#')} />
                <CheckItem label={isES ? 'Anotaciones de diseño' : 'Design annotations'} data={copilotData.annotations.length >= 1} />
                <CheckItem label={isES ? 'Peso especificado' : 'Weight specified'} data={copilotData.weight > 0} />
              </div>
            </div>

            {/* JS Data */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {isES ? 'Datos JS' : 'JS Data'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-gray-500 hover:text-green-600"
                  onClick={() => navigator.clipboard.writeText(jsCode)}
                >
                  <Download className="w-3 h-3" />
                  {isES ? 'Copiar' : 'Copy'}
                </Button>
              </div>
              <div className="max-h-[300px] overflow-auto">
                <pre className="p-3 text-[9px] leading-relaxed font-mono text-gray-700 bg-gray-50 whitespace-pre-wrap break-all">
                  {jsCode}
                </pre>
              </div>
            </div>

            {/* Quick Specs Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                {isES ? 'Resumen Rápido' : 'Quick Summary'}
              </h4>
              <div className="space-y-2">
                <SpecRow label={isES ? 'Tipo' : 'Type'} value={translateType(copilotData.productType, isES)} />
                <SpecRow label={isES ? 'Estilo' : 'Style'} value={copilotData.style} />
                <SpecRow label={isES ? 'Material' : 'Material'} value={translateMaterial(copilotData.material.main, isES)} />
                <SpecRow label={isES ? 'Acabado' : 'Finish'} value={copilotData.finish} />
                <SpecRow label={isES ? 'Altura' : 'Height'} value={`${copilotData.dimensions.height} cm`} />
                <SpecRow label={isES ? 'Ancho' : 'Width'} value={`${copilotData.dimensions.width} cm`} />
                <SpecRow label={isES ? 'Profundidad' : 'Depth'} value={`${copilotData.dimensions.depth} cm`} />
                <SpecRow label={isES ? 'Peso' : 'Weight'} value={`${copilotData.weight} kg`} />
                {copilotData.dimensions.seatHeight && (
                  <SpecRow label={isES ? 'Altura Asiento' : 'Seat Height'} value={`${copilotData.dimensions.seatHeight} cm`} />
                )}
              </div>

              {/* Color palette inline */}
              <div className="mt-3 flex gap-1.5">
                {[
                  { hex: copilotData.colorPalette.primary, label: isES ? 'Material' : 'Material' },
                  { hex: copilotData.colorPalette.secondary, label: isES ? 'Destacado' : 'Feature' },
                  { hex: copilotData.colorPalette.pearlGray, label: 'Pearl Gray' },
                  { hex: copilotData.colorPalette.darkGray, label: 'Dark Gray' },
                ].map((item, i) => (
                  <div key={i} className="flex-1">
                    <div
                      className="h-6 rounded border border-gray-200"
                      style={{ backgroundColor: item.hex }}
                    />
                    <p className="text-[7px] text-gray-400 mt-0.5 text-center">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={resetAll}
              className="text-gray-500 gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {isES ? 'Empezar de Nuevo' : 'Start Over'}
            </Button>
            <Button
              variant="outline"
              onClick={goBackToEdit}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {isES ? 'Volver a Editar' : 'Back to Edit'}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={downloadAsImage}
              disabled={downloadingImage}
              className="bg-purple-700 hover:bg-purple-800 text-white gap-2 shadow-md min-w-[140px]"
            >
              {downloadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
              {isES ? 'Descargar PNG' : 'Download PNG'}
            </Button>
            <Button
              onClick={() => exportFicha('svg')}
              disabled={fichaExportLoading}
              className="bg-blue-700 hover:bg-blue-800 text-white gap-2 shadow-md min-w-[140px]"
            >
              {fichaExportLoading && fichaExportFormat === 'svg' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileImage className="w-4 h-4" />
              )}
              {isES ? 'Exportar SVG' : 'Export SVG'}
            </Button>
            <Button
              onClick={() => exportFicha('pdf')}
              disabled={fichaExportLoading}
              className="bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white gap-2 shadow-md min-w-[140px]"
            >
              {fichaExportLoading && fichaExportFormat === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {isES ? 'Exportar PDF' : 'Export PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{label}</span>
      <span className="text-xs font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function CheckItem({ label, data }: { label: string; data: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {data ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
      )}
      <span className={data ? 'text-gray-700' : 'text-amber-700'}>{label}</span>
    </div>
  );
}

function translateType(t: string, isES: boolean): string {
  if (!isES) return t;
  const map: Record<string, string> = {
    chair: 'Silla', stool: 'Taburete', table: 'Mesa', sofa: 'Sofá',
    bed: 'Cama', desk: 'Escritorio', cabinet: 'Gabinete', shelving: 'Estante',
    bench: 'Banco', ottoman: 'Puf',
  };
  return map[t] || t;
}

function translateMaterial(m: string, isES: boolean): string {
  if (!isES) return m;
  const map: Record<string, string> = {
    wood: 'Madera', metal: 'Metal', fabric: 'Tela', leather: 'Cuero',
    glass: 'Vidrio', stone: 'Piedra', rattan: 'Ratán', bamboo: 'Bambú',
    plastic: 'Plástico', composite: 'Compuesto',
  };
  return map[m] || m;
}
