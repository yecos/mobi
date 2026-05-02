'use client';

import React, { useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { useFicha } from '@/hooks/use-ficha';
import { buildFichaSvg, svgToDataUrl } from '@/lib/ficha-svg-builder';
import {
  Ruler,
  Palette,
  Layers,
  Sparkles,
  Tag,
  Plus,
  Trash2,
  GripVertical,
  ArrowRight,
  Eye,
  FileText,
  FileImage,
  RotateCcw,
  Loader2,
  ZoomIn,
  ZoomOut,
  Download,
  Code2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const PRODUCT_TYPES = [
  'chair', 'stool', 'table', 'sofa', 'bed', 'desk', 'cabinet', 'shelving', 'bench', 'ottoman',
];

const STYLES = [
  'modern', 'minimalist', 'luxury', 'industrial', 'scandinavian',
  'mid-century', 'rustic', 'transitional', 'contemporary', 'art-deco',
];

const MATERIALS = [
  'wood', 'metal', 'fabric', 'leather', 'glass', 'stone', 'rattan', 'bamboo', 'plastic', 'composite',
];

const FINISHES = [
  'natural', 'matte', 'polished', 'lacquered', 'oiled',
  'waxed', 'brushed', 'powder-coated', 'upholstered', 'stained',
];

interface FichaEditingViewProps {
  lang: string;
}

export function FichaEditingView({ lang }: FichaEditingViewProps) {
  const copilotData = useAppStore((s) => s.copilotData);
  const imagePreview = useAppStore((s) => s.imagePreview);
  const fichaExportLoading = useAppStore((s) => s.fichaExportLoading);
  const copilotViewImages = useAppStore((s) => s.copilotViewImages);
  const fichaAiImage = useAppStore((s) => s.fichaAiImage);
  const updateCopilotData = useAppStore((s) => s.updateCopilotData);
  const updateCopilotDimension = useAppStore((s) => s.updateCopilotDimension);
  const updateCopilotMaterial = useAppStore((s) => s.updateCopilotMaterial);
  const updateCopilotAnnotation = useAppStore((s) => s.updateCopilotAnnotation);
  const updateCopilotMaterialDetail = useAppStore((s) => s.updateCopilotMaterialDetail);
  const addCopilotMaterialDetail = useAppStore((s) => s.addCopilotMaterialDetail);
  const removeCopilotMaterialDetail = useAppStore((s) => s.removeCopilotMaterialDetail);
  const updateCopilotColor = useAppStore((s) => s.updateCopilotColor);
  const resetAll = useAppStore((s) => s.resetAll);
  const { goToReview, quickExport } = useFicha();

  const isES = lang === 'es';

  // Live SVG preview — rebuilds automatically when data changes
  const fichaSvg = useMemo(() => {
    if (!copilotData) return null;
    return buildFichaSvg(copilotData);
  }, [copilotData]);

  const fichaDataUrl = useMemo(() => {
    if (!fichaSvg) return null;
    return svgToDataUrl(fichaSvg);
  }, [fichaSvg]);

  // Generate JS code string for display
  const jsCode = useMemo(() => {
    if (!copilotData) return '';
    return `export const furnitureData = ${JSON.stringify(copilotData, null, 2)};`;
  }, [copilotData]);

  const [previewZoom, setPreviewZoom] = React.useState(0.5);
  const [showCode, setShowCode] = React.useState(false);
  const [downloadingImage, setDownloadingImage] = React.useState(false);

  // Download ficha as PNG image
  const downloadAsImage = React.useCallback(async () => {
    if (!fichaSvg) return;
    setDownloadingImage(true);
    try {
      // Create a canvas to render SVG → PNG
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 794 * 2; // 2x for retina
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
      img.src = fichaDataUrl || '';
    } catch {
      setDownloadingImage(false);
    }
  }, [fichaSvg, fichaDataUrl, copilotData]);

  // Copy JS code
  const copyJsCode = React.useCallback(() => {
    navigator.clipboard.writeText(jsCode).then(() => {
      // Brief visual feedback handled by state
    });
  }, [jsCode]);

  if (!copilotData) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">
              {isES ? 'Editar Ficha Técnica' : 'Edit Technical Sheet'}
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              {isES ? 'Modifica las medidas, materiales y detalles. La ficha se actualiza en tiempo real.' : 'Modify dimensions, materials, and details. The sheet updates in real-time.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              <Sparkles className="w-3 h-3 mr-1" />
              VIVA MOBILI
            </Badge>
          </div>
        </div>

        {/* Main content: 3 columns — Preview | Form | Data */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT: Live SVG Preview */}
          <div className="xl:col-span-5 space-y-4">
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm sticky top-6">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {isES ? 'Vista Previa de Ficha' : 'Sheet Preview'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setPreviewZoom(Math.max(0.3, previewZoom - 0.1))}
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-[10px] text-gray-400 w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setPreviewZoom(Math.min(1, previewZoom + 0.1))}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                  <div className="w-px h-4 bg-gray-200 mx-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-purple-500"
                    onClick={downloadAsImage}
                    disabled={downloadingImage}
                    title={isES ? 'Descargar como imagen PNG' : 'Download as PNG image'}
                  >
                    {downloadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-stone-100 overflow-auto" style={{ maxHeight: '80vh' }}>
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
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    {isES ? 'Generando vista previa...' : 'Generating preview...'}
                  </div>
                )}
              </div>
            </div>

            {/* AI Generated View Images (if available) */}
            {Object.values(copilotViewImages).some(Boolean) && (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                <div className="p-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {isES ? 'Vistas AI' : 'AI Views'}
                  </span>
                </div>
                <div className="p-3 grid grid-cols-2 gap-2">
                  {Object.entries(copilotViewImages).map(([key, img]) =>
                    img ? (
                      <div key={key} className="rounded-lg overflow-hidden border border-gray-200">
                        <img src={`data:image/png;base64,${img}`} alt={key} className="w-full h-24 object-cover" />
                        <div className="bg-gray-50 py-1 text-center">
                          <span className="text-[9px] font-medium text-gray-500 uppercase">{key}</span>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* AI Generated Ficha Image (if available) */}
            {fichaAiImage && (
              <div className="rounded-xl border border-purple-200 overflow-hidden bg-white shadow-sm">
                <div className="p-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                    {isES ? 'Ficha Generada por IA' : 'AI Generated Sheet'}
                  </span>
                </div>
                <div className="p-2">
                  <img
                    src={`data:image/png;base64,${fichaAiImage}`}
                    alt="AI Generated Ficha"
                    className="w-full rounded-lg border border-gray-200 shadow-sm"
                  />
                </div>
                <div className="px-3 pb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-purple-600 border-purple-200 hover:bg-purple-50 gap-2"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = `data:image/png;base64,${fichaAiImage}`;
                      a.download = `VIVA-MOBILI-${copilotData?.productType || 'ficha'}-ai-sheet.png`;
                      a.click();
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isES ? 'Descargar Imagen AI' : 'Download AI Image'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* CENTER: Editable Form */}
          <div className="xl:col-span-4 space-y-4">
            {/* Product Identity */}
            <EditSection title={isES ? 'Identidad del Producto' : 'Product Identity'} icon={<Tag className="w-4 h-4" />}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    {isES ? 'Tipo de Producto' : 'Product Type'}
                  </Label>
                  <Select
                    value={copilotData.productType}
                    onValueChange={(val) => updateCopilotData({ productType: val })}
                  >
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {isES ? translateType(t) : t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    {isES ? 'Estilo' : 'Style'}
                  </Label>
                  <Select
                    value={copilotData.style}
                    onValueChange={(val) => updateCopilotData({ style: val })}
                  >
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {isES ? translateStyle(s) : s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    {isES ? 'Material Principal' : 'Main Material'}
                  </Label>
                  <Select
                    value={copilotData.material.main}
                    onValueChange={(val) => updateCopilotMaterial({ main: val })}
                  >
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIALS.map((m) => (
                        <SelectItem key={m} value={m} className="capitalize">
                          {isES ? translateMaterial(m) : m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    {isES ? 'Acabado' : 'Finish'}
                  </Label>
                  <Select
                    value={copilotData.finish}
                    onValueChange={(val) => updateCopilotData({ finish: val })}
                  >
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FINISHES.map((f) => (
                        <SelectItem key={f} value={f} className="capitalize">
                          {isES ? translateFinish(f) : f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  {isES ? 'Característica Distintiva' : 'Distinctive Feature'}
                </Label>
                <Input
                  value={copilotData.feature}
                  onChange={(e) => updateCopilotData({ feature: e.target.value })}
                  className="h-10 mt-1"
                  placeholder={isES ? 'Ej: asiento de cuerda tejida, modular, almacenamiento...' : 'e.g. woven cane seat, modularity, storage...'}
                />
              </div>
            </EditSection>

            {/* Dimensions (HIGHLIGHTED) */}
            <EditSection
              title={isES ? 'Dimensiones (cm)' : 'Dimensions (cm)'}
              icon={<Ruler className="w-4 h-4" />}
              highlight
            >
              <div className="grid grid-cols-2 gap-4">
                <DimensionField
                  label={isES ? 'Altura' : 'Height'}
                  value={copilotData.dimensions.height}
                  onChange={(v) => updateCopilotDimension('height', v)}
                  unit="cm"
                  icon="↕"
                />
                <DimensionField
                  label={isES ? 'Ancho' : 'Width'}
                  value={copilotData.dimensions.width}
                  onChange={(v) => updateCopilotDimension('width', v)}
                  unit="cm"
                  icon="↔"
                />
                <DimensionField
                  label={isES ? 'Profundidad' : 'Depth'}
                  value={copilotData.dimensions.depth}
                  onChange={(v) => updateCopilotDimension('depth', v)}
                  unit="cm"
                  icon="↗"
                />
                <DimensionField
                  label={isES ? 'Altura Asiento' : 'Seat Height'}
                  value={copilotData.dimensions.seatHeight ?? 0}
                  onChange={(v) => updateCopilotDimension('seatHeight', v || null)}
                  unit="cm"
                  nullable
                  icon="⬍"
                />
              </div>
              <div className="mt-4">
                <DimensionField
                  label={isES ? 'Peso' : 'Weight'}
                  value={copilotData.weight}
                  onChange={(v) => updateCopilotData({ weight: v })}
                  unit="kg"
                  icon="⚖"
                />
              </div>
            </EditSection>

            {/* Material Details */}
            <EditSection title={isES ? 'Detalles de Material' : 'Material Details'} icon={<Layers className="w-4 h-4" />}>
              <div className="space-y-2">
                {copilotData.material.details.map((detail, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <Input
                      value={detail}
                      onChange={(e) => updateCopilotMaterialDetail(i, e.target.value)}
                      className="h-9 flex-1"
                      placeholder={`${isES ? 'Detalle' : 'Detail'} ${i + 1}`}
                    />
                    {copilotData.material.details.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-gray-400 hover:text-red-500"
                        onClick={() => removeCopilotMaterialDetail(i)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-800 gap-1"
                  onClick={addCopilotMaterialDetail}
                >
                  <Plus className="w-4 h-4" />
                  {isES ? 'Agregar detalle' : 'Add detail'}
                </Button>
              </div>
            </EditSection>

            {/* Design Highlights */}
            <EditSection title={isES ? 'Anotaciones de Diseño' : 'Design Highlights'} icon={<Sparkles className="w-4 h-4" />}>
              <div className="space-y-3">
                {copilotData.annotations.map((ann, i) => {
                  const labels = isES
                    ? ['Textura / Material', 'Estructura / Ensamblaje', 'Funcional / Destacado']
                    : ['Texture / Material', 'Structure / Joinery', 'Functional / Highlight'];
                  const icons = ['◈', '⬡', '◆'];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-purple-500 text-lg mt-2 flex-shrink-0">{icons[i] || '•'}</span>
                      <div className="flex-1">
                        <Label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                          {labels[i] || `${isES ? 'Detalle' : 'Detail'} ${i + 1}`}
                        </Label>
                        <Input
                          value={ann}
                          onChange={(e) => updateCopilotAnnotation(i, e.target.value)}
                          className="h-9 mt-1"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </EditSection>

            {/* Color Palette */}
            <EditSection title={isES ? 'Paleta de Colores' : 'Color Palette'} icon={<Palette className="w-4 h-4" />}>
              <div className="grid grid-cols-2 gap-4">
                <ColorField
                  label={isES ? 'Color Material' : 'Material Color'}
                  value={copilotData.colorPalette.primary}
                  onChange={(v) => updateCopilotColor('primary', v)}
                />
                <ColorField
                  label={isES ? 'Color Destacado' : 'Feature Color'}
                  value={copilotData.colorPalette.secondary}
                  onChange={(v) => updateCopilotColor('secondary', v)}
                />
                <ColorField
                  label="Pearl Gray"
                  value={copilotData.colorPalette.pearlGray}
                  onChange={(v) => updateCopilotColor('pearlGray', v)}
                />
                <ColorField
                  label="Dark Gray"
                  value={copilotData.colorPalette.darkGray}
                  onChange={(v) => updateCopilotColor('darkGray', v)}
                />
              </div>
              <div className="flex gap-2 mt-4">
                {Object.entries(copilotData.colorPalette).map(([key, hex]) => (
                  <div key={key} className="flex-1 text-center">
                    <div
                      className="h-10 rounded-lg border border-gray-200 shadow-sm transition-colors"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-[9px] text-gray-400 mt-1 block font-mono">{hex}</span>
                  </div>
                ))}
              </div>
            </EditSection>
          </div>

          {/* RIGHT: JS Data + Original Image */}
          <div className="xl:col-span-3 space-y-4">
            {/* Original Image */}
            {imagePreview && (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                <div className="p-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {isES ? 'Imagen Original' : 'Original Image'}
                  </span>
                </div>
                <div className="p-3">
                  <img src={imagePreview} alt="Furniture" className="w-full h-48 object-cover rounded-lg" />
                </div>
              </div>
            )}

            {/* JS Data Code */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {isES ? 'Datos JS (Editable)' : 'JS Data (Editable)'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-gray-500 hover:text-green-600"
                  onClick={copyJsCode}
                >
                  <Download className="w-3 h-3" />
                  {isES ? 'Copiar' : 'Copy'}
                </Button>
              </div>
              <div className="max-h-[500px] overflow-auto">
                <pre className="p-3 text-[10px] leading-relaxed font-mono text-gray-700 bg-gray-50 whitespace-pre-wrap break-all">
                  {jsCode}
                </pre>
              </div>
            </div>

            {/* Quick Summary */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
              <div className="p-3 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {isES ? 'Resumen' : 'Summary'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium capitalize">{copilotData.productType}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-sm text-gray-500 capitalize">{copilotData.style}</span>
                </div>

                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center gap-1 mb-1">
                    <Ruler className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-800">
                      {isES ? 'Dimensiones' : 'Dimensions'}
                    </span>
                  </div>
                  <div className="text-sm font-mono text-amber-900">
                    {copilotData.dimensions.height} × {copilotData.dimensions.width} × {copilotData.dimensions.depth} cm
                  </div>
                  {copilotData.dimensions.seatHeight ? (
                    <div className="text-xs text-amber-700 mt-0.5">
                      {isES ? 'Asiento' : 'Seat'}: {copilotData.dimensions.seatHeight} cm
                    </div>
                  ) : null}
                  <div className="text-xs text-amber-700 mt-0.5">
                    {isES ? 'Peso' : 'Weight'}: {copilotData.weight} kg
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span className="text-sm capitalize">{copilotData.material.main}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-sm capitalize">{copilotData.finish}</span>
                </div>

                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <span className="text-xs font-semibold text-purple-800">
                    {isES ? 'Característica' : 'Feature'}
                  </span>
                  <p className="text-sm text-purple-900 mt-0.5">{copilotData.feature}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <Button
            variant="outline"
            onClick={resetAll}
            className="text-gray-500 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {isES ? 'Empezar de Nuevo' : 'Start Over'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={downloadAsImage}
              disabled={downloadingImage}
              className="border-purple-300 text-purple-700 hover:bg-purple-50 gap-2"
            >
              {downloadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
              {isES ? 'Descargar PNG' : 'Download PNG'}
            </Button>
            <Button
              variant="outline"
              onClick={() => quickExport('svg')}
              disabled={fichaExportLoading}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-2"
            >
              {fichaExportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
              {isES ? 'Exportar SVG' : 'Export SVG'}
            </Button>
            <Button
              variant="outline"
              onClick={() => quickExport('pdf')}
              disabled={fichaExportLoading}
              className="border-green-300 text-green-700 hover:bg-green-50 gap-2"
            >
              {fichaExportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {isES ? 'Exportar PDF' : 'Export PDF'}
            </Button>
            <Button
              onClick={goToReview}
              className="bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white gap-2 shadow-md"
            >
              <Eye className="w-4 h-4" />
              {isES ? 'Revisar y Exportar' : 'Review & Export'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function EditSection({
  title,
  icon,
  highlight = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'rounded-xl border overflow-hidden bg-white shadow-sm',
      highlight ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'
    )}>
      <div className={cn(
        'flex items-center gap-2 px-4 py-3 border-b',
        highlight ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
      )}>
        <span className={highlight ? 'text-amber-600' : 'text-purple-500'}>{icon}</span>
        <span className={cn(
          'text-sm font-semibold uppercase tracking-wide',
          highlight ? 'text-amber-800' : 'text-gray-700'
        )}>{title}</span>
        {highlight && (
          <Badge className="bg-amber-200 text-amber-800 text-[10px] border-0 ml-2">
            {typeof window !== 'undefined' && document.documentElement.lang === 'es' ? 'Editable' : 'Editable'}
          </Badge>
        )}
      </div>
      <div className="px-4 py-4">
        {children}
      </div>
    </div>
  );
}

function DimensionField({
  label,
  value,
  onChange,
  unit,
  nullable = false,
  icon,
}: {
  label: string;
  value: number | null;
  onChange: (val: number | null) => void;
  unit: string;
  nullable?: boolean;
  icon?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-gray-500 uppercase tracking-wide font-medium flex items-center gap-1">
        {icon && <span className="text-amber-500">{icon}</span>}
        {label}
      </Label>
      <div className="flex items-center gap-2 mt-1">
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' && nullable) {
              onChange(null);
            } else {
              onChange(parseFloat(val) || 0);
            }
          }}
          className="h-10 text-base font-mono flex-1"
          min={0}
          step={0.5}
        />
        <span className="text-xs text-gray-400 font-medium w-8">{unit}</span>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 font-mono flex-1"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function translateType(t: string): string {
  const map: Record<string, string> = {
    chair: 'Silla', stool: 'Taburete', table: 'Mesa', sofa: 'Sofá',
    bed: 'Cama', desk: 'Escritorio', cabinet: 'Gabinete', shelving: 'Estante',
    bench: 'Banco', ottoman: 'Puf',
  };
  return map[t] || t;
}

function translateStyle(s: string): string {
  const map: Record<string, string> = {
    modern: 'Moderno', minimalist: 'Minimalista', luxury: 'Lujo', industrial: 'Industrial',
    scandinavian: 'Escandinavo', 'mid-century': 'Mid-Century', rustic: 'Rústico',
    transitional: 'Transicional', contemporary: 'Contemporáneo', 'art-deco': 'Art Deco',
  };
  return map[s] || s;
}

function translateMaterial(m: string): string {
  const map: Record<string, string> = {
    wood: 'Madera', metal: 'Metal', fabric: 'Tela', leather: 'Cuero',
    glass: 'Vidrio', stone: 'Piedra', rattan: 'Ratán', bamboo: 'Bambú',
    plastic: 'Plástico', composite: 'Compuesto',
  };
  return map[m] || m;
}

function translateFinish(f: string): string {
  const map: Record<string, string> = {
    natural: 'Natural', matte: 'Mate', polished: 'Pulido', lacquered: 'Laqueado',
    oiled: 'Aceitado', waxed: 'Encerado', brushed: 'Cepillado',
    'powder-coated': 'Pintura electrostática', upholstered: 'Tapizado', stained: 'Teñido',
  };
  return map[f] || f;
}
