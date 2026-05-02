'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useCopilot } from '@/hooks/use-copilot';
import { useAppStore } from '@/store/app-store';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function CopilotPanel() {
  const lang = useAppStore((s) => s.lang);
  const imagePreview = useAppStore((s) => s.imagePreview);
  const {
    copilotOpen,
    copilotMessages,
    copilotLoading,
    copilotData,
    copilotViewImages,
    copilotSheetPdf,
    analyzeWithCopilot,
    downloadSheet,
    clearCopilotMessages,
    setCopilotOpen,
  } = useCopilot();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedData, setExpandedData] = useState(false);
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

      {/* Panel - Microsoft Copilot Style */}
      <div className={cn(
        'fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col',
        'transform transition-transform duration-300 ease-in-out',
        copilotOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header - Copilot branding */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Copilot</h2>
              <p className="text-[11px] text-gray-400">
                {lang === 'en' ? 'Powered by Microsoft Azure OpenAI' : 'Powered by Microsoft Azure OpenAI'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
          {/* Welcome message if no messages */}
          {copilotMessages.length === 0 && (
            <div className="py-6">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200/50">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {lang === 'en' ? 'VIVA MOBILI Copilot' : 'VIVA MOBILI Copilot'}
                </h3>
                <p className="text-sm text-gray-500 max-w-[300px] mx-auto leading-relaxed">
                  {lang === 'en'
                    ? 'Analyze furniture images with AI vision and generate professional product sheets with photorealistic 4-view renders.'
                    : 'Analiza imágenes de mobiliario con visión IA y genera fichas profesionales con renders fotorrealistas en 4 vistas.'}
                </p>
              </div>

              {/* Smart action suggestions */}
              <div className="space-y-2 mb-6">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  {lang === 'en' ? 'Smart Actions' : 'Acciones Inteligentes'}
                </p>
                <SmartAction
                  icon={<Eye className="w-4 h-4" />}
                  title={lang === 'en' ? 'Analyze Furniture' : 'Analizar Mobiliario'}
                  description={lang === 'en' ? 'Identify type, style, materials & dimensions' : 'Identifica tipo, estilo, materiales y dimensiones'}
                />
                <SmartAction
                  icon={<Layers className="w-4 h-4" />}
                  title={lang === 'en' ? 'Generate 4-View Renders' : 'Generar Renders 4 Vistas'}
                  description={lang === 'en' ? 'Photorealistic front, side, top & perspective' : 'Frontal, lateral, planta y perspectiva fotorrealistas'}
                />
                <SmartAction
                  icon={<FileText className="w-4 h-4" />}
                  title={lang === 'en' ? 'Create Product Sheet' : 'Crear Ficha de Producto'}
                  description={lang === 'en' ? 'VIVA MOBILI branded PDF with specs & palette' : 'PDF VIVA MOBILI con especificaciones y paleta'}
                />
              </div>

              {imagePreview ? (
                <div className="space-y-3">
                  <div className="relative mx-auto w-52 h-40 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <img src={imagePreview} alt="Furniture" className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-blue-600 text-white text-[10px] border-0 shadow-md">
                        <Zap className="w-3 h-3 mr-1" />
                        {lang === 'en' ? 'Ready' : 'Listo'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={analyzeWithCopilot}
                    disabled={copilotLoading}
                    className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-700 hover:via-purple-700 hover:to-pink-600 text-white gap-2 h-11 rounded-xl shadow-lg shadow-purple-200/50 font-medium"
                  >
                    <Sparkles className="w-4 h-4" />
                    {lang === 'en' ? 'Generate Product Sheet' : 'Generar Ficha de Producto'}
                  </Button>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500">
                    {lang === 'en'
                      ? 'Upload a furniture image first, then click Generate'
                      : 'Sube primero una imagen de mobiliario, luego haz clic en Generar'}
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
                  {lang === 'en' ? 'Analyzing with Microsoft Azure OpenAI...' : 'Analizando con Microsoft Azure OpenAI...'}
                </p>
                <p className="text-[10px] text-gray-500">
                  {lang === 'en' ? 'GPT-4o Vision + DALL-E 3' : 'GPT-4o Vision + DALL-E 3'}
                </p>
              </div>
            </div>
          )}

          {/* Extracted data panel */}
          {copilotData && !copilotLoading && (
            <CopilotDataPanel
              data={copilotData}
              expanded={expandedData}
              onToggle={() => setExpandedData(!expandedData)}
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

          {/* PDF download */}
          {copilotSheetPdf && !copilotLoading && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {lang === 'en' ? 'Product Sheet Ready' : 'Ficha de Producto Lista'}
                    </p>
                    <p className="text-[10px] text-green-600">VIVA MOBILI • PDF</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={downloadSheet}
                  className="bg-green-700 hover:bg-green-800 text-white gap-1 h-8 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </Button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Action bar at bottom */}
        {imagePreview && copilotMessages.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 bg-white">
            <Button
              onClick={analyzeWithCopilot}
              disabled={copilotLoading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-700 hover:via-purple-700 hover:to-pink-600 text-white gap-2 h-10 rounded-xl shadow-lg shadow-purple-200/50 font-medium"
            >
              {copilotLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {copilotLoading
                ? (lang === 'en' ? 'Generating...' : 'Generando...')
                : (lang === 'en' ? 'Regenerate Product Sheet' : 'Regenerar Ficha de Producto')
              }
            </Button>
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

// ── Data Panel ──
function CopilotDataPanel({
  data,
  expanded,
  onToggle,
  lang,
}: {
  data: CopilotFurnitureData;
  expanded: boolean;
  onToggle: () => void;
  lang: string;
}) {
  const [copied, setCopied] = useState(false);

  const jsExport = `export const furnitureData = ${JSON.stringify(data, null, 2)};`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsExport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-gray-800">
            {lang === 'en' ? 'Extracted Data' : 'Datos Extraídos'}
          </span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-180')} />
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Product type & style */}
          <div className="grid grid-cols-2 gap-2">
            <DataBadge icon={<Layers className="w-3 h-3" />} label={lang === 'en' ? 'Type' : 'Tipo'} value={data.productType} />
            <DataBadge icon={<Sparkles className="w-3 h-3" />} label={lang === 'en' ? 'Style' : 'Estilo'} value={data.style} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DataBadge icon={<Layers className="w-3 h-3" />} label={lang === 'en' ? 'Material' : 'Material'} value={data.material.main} />
            <DataBadge icon={<Palette className="w-3 h-3" />} label={lang === 'en' ? 'Finish' : 'Acabado'} value={data.finish} />
          </div>

          {/* Feature */}
          <div className="bg-gray-50 rounded-lg p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
              {lang === 'en' ? 'Distinctive Feature' : 'Característica Distintiva'}
            </span>
            <p className="text-xs text-gray-800 font-medium mt-0.5">{data.feature}</p>
          </div>

          {/* Dimensions */}
          <div className="bg-gray-50 rounded-lg p-2.5">
            <div className="flex items-center gap-1 mb-1.5">
              <Ruler className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                {lang === 'en' ? 'Dimensions (cm)' : 'Dimensiones (cm)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-700">
              <div>H: <strong>{data.dimensions.height}</strong></div>
              <div>W: <strong>{data.dimensions.width}</strong></div>
              <div>D: <strong>{data.dimensions.depth}</strong></div>
              {data.dimensions.seatHeight && (
                <div>Seat: <strong>{data.dimensions.seatHeight}</strong></div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {lang === 'en' ? 'Weight' : 'Peso'}: <strong>{data.weight} kg</strong>
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

          {/* JS Object Export */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                {lang === 'en' ? 'JavaScript Export' : 'Exportar JavaScript'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-5 px-1.5 text-[10px] text-gray-400 hover:text-gray-600"
              >
                {copied ? <Check className="w-3 h-3 mr-0.5" /> : <Copy className="w-3 h-3 mr-0.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <pre className="text-[9px] text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                {jsExport}
              </pre>
            </div>
          </div>
        </div>
      )}
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

  const viewLabels: Record<string, string> = {
    front: lang === 'en' ? 'Front' : 'Frontal',
    side: lang === 'en' ? 'Side' : 'Lateral',
    top: lang === 'en' ? 'Top' : 'Planta',
    perspective: lang === 'en' ? 'Perspective' : 'Perspectiva',
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-gray-800">
            {lang === 'en' ? 'Photorealistic Views' : 'Vistas Fotorrealistas'}
          </span>
          <Badge variant="secondary" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
            DALL-E 3
          </Badge>
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
