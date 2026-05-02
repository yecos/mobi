'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useCopilot } from '@/hooks/use-copilot';
import { useAppStore } from '@/store/app-store';
import { FichaEditor } from './FichaEditor';
import type { CopilotMessage, CopilotFurnitureData } from '@/lib/types';
import {
  X,
  Bot,
  User,
  Loader2,
  Download,
  Sparkles,
  RotateCcw,
  Palette,
  Ruler,
  Layers,
  Tag,
  FileText,
  ChevronDown,
  Eye,
  Zap,
  Copy,
  Check,
  Pencil,
  FileImage,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function CopilotPanel() {
  const lang = useAppStore((s) => s.lang);
  const imagePreview = useAppStore((s) => s.imagePreview);
  const copilotData = useAppStore((s) => s.copilotData);
  const fichaEditMode = useAppStore((s) => s.fichaEditMode);
  const setFichaEditMode = useAppStore((s) => s.setFichaEditMode);
  const {
    copilotOpen,
    copilotMessages,
    copilotLoading,
    copilotViewImages,
    copilotSheetPdf,
    copilotSheetSvg,
    analyzeWithCopilot,
    generateFromEditedData,
    downloadSheet,
    downloadSvg,
    clearCopilotMessages,
    setCopilotOpen,
  } = useCopilot();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedViews, setExpandedViews] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [copilotMessages]);

  if (!copilotOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        onClick={() => setCopilotOpen(false)}
      />

      {/* Panel - wider to accommodate ficha editor */}
      <div className={cn(
        'fixed right-0 top-0 bottom-0 w-full sm:w-[540px] bg-white shadow-2xl z-50 flex flex-col',
        'transform transition-transform duration-300 ease-in-out',
        copilotOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Copilot</h2>
              <p className="text-[11px] text-gray-400">
                VIVA MOBILI • {fichaEditMode
                  ? (lang === 'es' ? 'Editando Ficha' : 'Editing Sheet')
                  : (lang === 'es' ? 'Análisis IA' : 'AI Analysis')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {copilotData && !fichaEditMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFichaEditMode(true)}
                className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 h-8 w-8 p-0"
                title={lang === 'es' ? 'Editar ficha' : 'Edit sheet'}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {copilotData && fichaEditMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFichaEditMode(false)}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 h-8 w-8 p-0"
                title={lang === 'es' ? 'Volver a vista' : 'Back to view'}
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCopilotMessages}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 h-8 w-8 p-0"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCopilotOpen(false)}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── FICHA EDIT MODE ── */}
          {fichaEditMode && copilotData ? (
            <>
              {/* Edit mode header */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Pencil className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-800">
                    {lang === 'es' ? 'Modo Edición' : 'Edit Mode'}
                  </span>
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  {lang === 'es'
                    ? 'Edita las medidas, materiales y detalles de la ficha. Al finalizar, genera el PDF o SVG actualizado.'
                    : 'Edit dimensions, materials, and details of the sheet. When done, generate the updated PDF or SVG.'}
                </p>
              </div>

              {/* Editable Ficha */}
              <FichaEditor data={copilotData} lang={lang} />

              {/* Generate Actions */}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => generateFromEditedData(copilotData)}
                  disabled={copilotLoading}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-700 hover:via-purple-700 hover:to-pink-600 text-white gap-2 h-11 rounded-xl shadow-lg shadow-purple-200/50 font-medium"
                >
                  {copilotLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {copilotLoading
                    ? (lang === 'es' ? 'Generando...' : 'Generating...')
                    : (lang === 'es' ? 'Generar Ficha con Datos Editados' : 'Generate Sheet with Edited Data')}
                </Button>
              </div>

              {/* Download buttons when sheet is ready */}
              {(copilotSheetPdf || copilotSheetSvg) && !copilotLoading && (
                <div className="grid grid-cols-2 gap-2">
                  {copilotSheetPdf && (
                    <Button
                      onClick={downloadSheet}
                      className="bg-green-700 hover:bg-green-800 text-white gap-1.5 h-10 rounded-xl"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {lang === 'es' ? 'Descargar PDF' : 'Download PDF'}
                    </Button>
                  )}
                  {copilotSheetSvg && (
                    <Button
                      onClick={downloadSvg}
                      className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5 h-10 rounded-xl"
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      {lang === 'es' ? 'Descargar SVG' : 'Download SVG'}
                    </Button>
                  )}
                </div>
              )}

              {/* View images if available */}
              {copilotViewImages && !copilotLoading && (
                <CopilotViewsPanel
                  viewImages={copilotViewImages}
                  expandedView={expandedViews}
                  onExpand={setExpandedViews}
                  lang={lang}
                />
              )}
            </>
          ) : (
            <>
              {/* ── NORMAL MODE (no editing) ── */}

              {/* Welcome message if no messages */}
              {copilotMessages.length === 0 && (
                <div className="py-6">
                  <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200/50">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      VIVA MOBILI Copilot
                    </h3>
                    <p className="text-sm text-gray-500 max-w-[300px] mx-auto leading-relaxed">
                      {lang === 'es'
                        ? 'Analiza imágenes de mobiliario con IA y genera fichas técnicas profesionales editables con renders en 4 vistas.'
                        : 'Analyze furniture images with AI and generate editable professional product sheets with 4-view renders.'}
                    </p>
                  </div>

                  {/* Smart action suggestions */}
                  <div className="space-y-2 mb-6">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      {lang === 'es' ? 'Acciones Inteligentes' : 'Smart Actions'}
                    </p>
                    <SmartAction
                      icon={<Eye className="w-4 h-4" />}
                      title={lang === 'es' ? 'Analizar Mobiliario' : 'Analyze Furniture'}
                      description={lang === 'es' ? 'Identifica tipo, estilo, materiales y dimensiones' : 'Identify type, style, materials & dimensions'}
                    />
                    <SmartAction
                      icon={<Pencil className="w-4 h-4" />}
                      title={lang === 'es' ? 'Editar Ficha' : 'Edit Sheet'}
                      description={lang === 'es' ? 'Modifica medidas y detalles antes de exportar' : 'Modify dimensions and details before export'}
                    />
                    <SmartAction
                      icon={<FileText className="w-4 h-4" />}
                      title={lang === 'es' ? 'Exportar PDF / SVG' : 'Export PDF / SVG'}
                      description={lang === 'es' ? 'Ficha VIVA MOBILI con especificaciones y paleta' : 'VIVA MOBILI sheet with specs & palette'}
                    />
                  </div>

                  {imagePreview ? (
                    <div className="space-y-3">
                      <div className="relative mx-auto w-52 h-40 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                        <img src={imagePreview} alt="Furniture" className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2">
                          <Badge className="bg-blue-600 text-white text-[10px] border-0 shadow-md">
                            <Zap className="w-3 h-3 mr-1" />
                            {lang === 'es' ? 'Listo' : 'Ready'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={analyzeWithCopilot}
                        disabled={copilotLoading}
                        className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-700 hover:via-purple-700 hover:to-pink-600 text-white gap-2 h-11 rounded-xl shadow-lg shadow-purple-200/50 font-medium"
                      >
                        <Sparkles className="w-4 h-4" />
                        {lang === 'es' ? 'Generar Ficha de Producto' : 'Generate Product Sheet'}
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-500">
                        {lang === 'es'
                          ? 'Sube primero una imagen de mobiliario, luego haz clic en Generar'
                          : 'Upload a furniture image first, then click Generate'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Chat messages */}
              {copilotMessages.map((msg) => (
                <CopilotChatMessage key={msg.id} message={msg} lang={lang} />
              ))}

              {/* Loading indicator */}
              {copilotLoading && (
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-800">
                      {lang === 'es' ? 'Analizando mobiliario con IA...' : 'Analyzing furniture with AI...'}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {lang === 'es' ? 'Extrayendo tipo, estilo, materiales y dimensiones' : 'Extracting type, style, materials & dimensions'}
                    </p>
                  </div>
                </div>
              )}

              {/* Extracted data panel (read-only, with edit button) */}
              {copilotData && !copilotLoading && (
                <CopilotDataPanel
                  data={copilotData}
                  onEdit={() => setFichaEditMode(true)}
                  lang={lang}
                />
              )}

              {/* View images */}
              {copilotViewImages && !copilotLoading && (
                <CopilotViewsPanel
                  viewImages={copilotViewImages}
                  expandedView={expandedViews}
                  onExpand={setExpandedViews}
                  lang={lang}
                />
              )}

              {/* PDF/SVG download */}
              {(copilotSheetPdf || copilotSheetSvg) && !copilotLoading && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-700" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          {lang === 'es' ? 'Ficha de Producto Lista' : 'Product Sheet Ready'}
                        </p>
                        <p className="text-[10px] text-green-600">VIVA MOBILI</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {copilotSheetPdf && (
                      <Button
                        size="sm"
                        onClick={downloadSheet}
                        className="bg-green-700 hover:bg-green-800 text-white gap-1 h-8 rounded-lg"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </Button>
                    )}
                    {copilotSheetSvg && (
                      <Button
                        size="sm"
                        onClick={downloadSvg}
                        className="bg-blue-700 hover:bg-blue-800 text-white gap-1 h-8 rounded-lg"
                      >
                        <FileImage className="w-3.5 h-3.5" />
                        SVG
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Action bar at bottom */}
        {imagePreview && copilotMessages.length > 0 && !fichaEditMode && (
          <div className="border-t border-gray-100 px-5 py-4 bg-white flex gap-2">
            <Button
              onClick={analyzeWithCopilot}
              disabled={copilotLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-700 hover:via-purple-700 hover:to-pink-600 text-white gap-2 h-10 rounded-xl shadow-lg shadow-purple-200/50 font-medium"
            >
              {copilotLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {copilotLoading
                ? (lang === 'es' ? 'Generando...' : 'Generating...')
                : (lang === 'es' ? 'Regenerar Ficha' : 'Regenerate Sheet')
              }
            </Button>
            {copilotData && (
              <Button
                onClick={() => setFichaEditMode(true)}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50 gap-1.5 h-10 rounded-xl"
              >
                <Pencil className="w-4 h-4" />
                {lang === 'es' ? 'Editar' : 'Edit'}
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Smart Action Card ──
function SmartAction({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-default">
      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-800">{title}</p>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
    </div>
  );
}

// ── Chat Message ──
function CopilotChatMessage({ message, lang }: { message: CopilotMessage; lang: string }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser
          ? 'bg-gray-100'
          : 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 shadow-sm'
      )}>
        {isUser ? (
          <User className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-white" />
        )}
      </div>
      <div className={cn(
        'rounded-2xl px-3.5 py-2.5 max-w-[85%] text-[13px] leading-relaxed',
        isUser
          ? 'bg-gray-100 text-gray-800'
          : 'bg-gray-50 text-gray-700 border border-gray-100'
      )}>
        {message.imageData && (
          <div className="mb-2 rounded-lg overflow-hidden border border-gray-200">
            <img src={message.imageData} alt="Uploaded" className="w-full h-24 object-cover" />
          </div>
        )}
        {message.content.split('\n').map((line, i) => {
          if (line.startsWith('•') || line.startsWith('-')) {
            return <div key={i} className="pl-2">• {line.slice(1).trim()}</div>;
          }
          if (line.startsWith('**')) {
            const bold = line.replace(/\*\*(.*?)\*\*/g, '$1');
            return <div key={i} className="font-semibold">{bold}</div>;
          }
          if (line.match(/^✅|^❌/)) {
            return <div key={i} className="font-medium">{line}</div>;
          }
          return line ? <div key={i}>{line}</div> : <br key={i} />;
        })}
      </div>
    </div>
  );
}

// ── Data Panel (read-only, with edit button) ──
function CopilotDataPanel({
  data,
  onEdit,
  lang,
}: {
  data: CopilotFurnitureData;
  onEdit: () => void;
  lang: string;
}) {
  const isES = lang === 'es';

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-gray-800">
            {isES ? 'Datos Extraídos' : 'Extracted Data'}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="h-7 text-[10px] gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          <Pencil className="w-3 h-3" />
          {isES ? 'Editar' : 'Edit'}
        </Button>
      </div>
      <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
        {/* Product type & style */}
        <div className="grid grid-cols-2 gap-2">
          <DataBadge icon={<Layers className="w-3 h-3" />} label={isES ? 'Tipo' : 'Type'} value={data.productType} />
          <DataBadge icon={<Sparkles className="w-3 h-3" />} label={isES ? 'Estilo' : 'Style'} value={data.style} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DataBadge icon={<Layers className="w-3 h-3" />} label={isES ? 'Material' : 'Material'} value={data.material.main} />
          <DataBadge icon={<Palette className="w-3 h-3" />} label={isES ? 'Acabado' : 'Finish'} value={data.finish} />
        </div>

        {/* Feature */}
        <div className="bg-gray-50 rounded-lg p-2.5">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
            {isES ? 'Característica Distintiva' : 'Distinctive Feature'}
          </span>
          <p className="text-xs text-gray-800 font-medium mt-0.5">{data.feature}</p>
        </div>

        {/* Dimensions */}
        <div className="bg-gray-50 rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1.5">
            <Ruler className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
              {isES ? 'Dimensiones (cm)' : 'Dimensions (cm)'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs text-gray-700">
            <div>{isES ? 'Altura' : 'H'}: <strong>{data.dimensions.height}</strong></div>
            <div>{isES ? 'Ancho' : 'W'}: <strong>{data.dimensions.width}</strong></div>
            <div>{isES ? 'Profundidad' : 'D'}: <strong>{data.dimensions.depth}</strong></div>
            {data.dimensions.seatHeight ? (
              <div>{isES ? 'Asiento' : 'Seat'}: <strong>{data.dimensions.seatHeight}</strong></div>
            ) : null}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {isES ? 'Peso' : 'Weight'}: <strong>{data.weight} kg</strong>
          </div>
        </div>

        {/* Color palette */}
        <div className="flex gap-1.5">
          {Object.entries(data.colorPalette).map(([key, hex]) => (
            <div key={key} className="flex-1 text-center">
              <div className="h-6 rounded-md border border-gray-200 shadow-sm" style={{ backgroundColor: hex }} />
              <span className="text-[8px] text-gray-400 mt-0.5 block">{key}</span>
            </div>
          ))}
        </div>

        {/* Annotations */}
        <div className="space-y-1.5">
          {data.annotations.map((ann, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
              <span className="text-purple-500 flex-shrink-0 mt-px">◈</span>
              {ann}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Views Panel ──
function CopilotViewsPanel({
  viewImages,
  expandedView,
  onExpand,
  lang,
}: {
  viewImages: Record<string, string | null>;
  expandedView: string | null;
  onExpand: (view: string | null) => void;
  lang: string;
}) {
  const hasAny = Object.values(viewImages).some(Boolean);
  if (!hasAny) return null;

  const isES = lang === 'es';
  const viewLabels: Record<string, string> = {
    front: isES ? 'Frontal' : 'Front',
    side: isES ? 'Lateral' : 'Side',
    top: isES ? 'Planta' : 'Top',
    perspective: isES ? 'Perspectiva' : 'Perspective',
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-gray-800">
            {isES ? 'Vistas Fotorrealistas' : 'Photorealistic Views'}
          </span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(viewImages).map(([view, imageBase64]) => {
            if (!imageBase64) return null;
            const isExpanded = expandedView === view;

            return (
              <div
                key={view}
                className={cn(
                  'rounded-xl overflow-hidden border border-gray-200 cursor-pointer hover:border-purple-300 transition-all shadow-sm',
                  isExpanded && 'col-span-2'
                )}
                onClick={() => onExpand(isExpanded ? null : view)}
              >
                <img
                  src={`data:image/png;base64,${imageBase64}`}
                  alt={`${viewLabels[view] || view} view`}
                  className={cn('w-full object-cover', isExpanded ? 'h-52' : 'h-28')}
                />
                <div className="bg-gray-50 px-2 py-1.5 text-center">
                  <span className="text-[10px] font-medium text-gray-600">
                    {viewLabels[view] || view}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Data Badge ──
function DataBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-2">
      <span className="text-purple-500">{icon}</span>
      <div>
        <div className="text-[8px] text-gray-400 uppercase tracking-wide font-medium">{label}</div>
        <div className="text-[11px] font-medium text-gray-800 capitalize">{value}</div>
      </div>
    </div>
  );
}
