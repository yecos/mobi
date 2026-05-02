'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useCopilot } from '@/hooks/use-copilot';
import { useAppStore } from '@/store/app-store';
import { t } from '@/lib/i18n';
import type { CopilotMessage, CopilotFurnitureData } from '@/lib/types';
import {
  X,
  Send,
  Bot,
  User,
  Loader2,
  Download,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  Palette,
  Ruler,
  Layers,
  Tag,
  FileText,
  ChevronDown,
  Eye,
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

  // Auto-scroll to bottom
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

      {/* Panel */}
      <div className={cn(
        'fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-white shadow-2xl z-50 flex flex-col',
        'transform transition-transform duration-300 ease-in-out',
        copilotOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-gradient-to-r from-amber-800 to-amber-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-200" />
            <div>
              <h2 className="text-sm font-bold text-white">VIVA MOBILI Copilot</h2>
              <p className="text-[10px] text-amber-200">
                {lang === 'en' ? 'AI Product Sheet Generator' : 'Generador de Fichas con IA'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCopilotMessages}
              className="text-amber-200 hover:text-white hover:bg-amber-700 h-7 w-7 p-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCopilotOpen(false)}
              className="text-amber-200 hover:text-white hover:bg-amber-700 h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Welcome message if no messages */}
          {copilotMessages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-amber-700" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-1">
                {lang === 'en' ? 'Furniture Copilot' : 'Copilot de Mobiliario'}
              </h3>
              <p className="text-xs text-stone-500 max-w-[280px] mx-auto mb-6">
                {lang === 'en'
                  ? 'Upload a furniture photo and I\'ll analyze it to generate a professional VIVA MOBILI product sheet with photorealistic views.'
                  : 'Sube una foto de mobiliario y la analizaré para generar una ficha profesional VIVA MOBILI con vistas fotorrealistas.'}
              </p>

              {imagePreview ? (
                <div className="space-y-3">
                  <div className="relative mx-auto w-48 h-36 rounded-lg overflow-hidden border border-stone-200">
                    <img src={imagePreview} alt="Furniture" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/10 flex items-end justify-center pb-2">
                      <Badge variant="secondary" className="text-[10px] bg-white/90">
                        {lang === 'en' ? 'Ready to analyze' : 'Lista para analizar'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={analyzeWithCopilot}
                    disabled={copilotLoading}
                    className="bg-amber-800 hover:bg-amber-900 text-white gap-2"
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    {lang === 'en' ? 'Generate Product Sheet' : 'Generar Ficha de Producto'}
                  </Button>
                </div>
              ) : (
                <div className="bg-stone-50 rounded-lg p-4 text-xs text-stone-500">
                  {lang === 'en'
                    ? 'Upload a furniture image first, then click "Generate Product Sheet"'
                    : 'Sube primero una imagen de mobiliario, luego haz clic en "Generar Ficha de Producto"'}
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
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
              <Loader2 className="w-4 h-4 text-amber-700 animate-spin" />
              <span className="text-xs text-amber-800">
                {lang === 'en' ? 'Analyzing and generating views...' : 'Analizando y generando vistas...'}
              </span>
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
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-700" />
                    <span className="text-xs font-medium text-green-800">
                      {lang === 'en' ? 'Product Sheet PDF Ready' : 'Ficha de Producto PDF Lista'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadSheet}
                    className="text-green-700 border-green-300 hover:bg-green-100 h-7 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Action bar at bottom */}
        {imagePreview && copilotMessages.length > 0 && (
          <div className="border-t border-stone-200 px-4 py-3 bg-stone-50">
            <Button
              onClick={analyzeWithCopilot}
              disabled={copilotLoading}
              className="w-full bg-amber-800 hover:bg-amber-900 text-white gap-2"
              size="sm"
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

// ── Chat Message Component ──
function CopilotChatMessage({ message, lang }: { message: CopilotMessage; lang: string }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-stone-100' : 'bg-amber-100'
      )}>
        {isUser ? (
          <User className="w-3 h-3 text-stone-600" />
        ) : (
          <Bot className="w-3 h-3 text-amber-700" />
        )}
      </div>
      <div className={cn(
        'rounded-xl px-3 py-2 max-w-[85%] text-xs leading-relaxed',
        isUser
          ? 'bg-stone-100 text-stone-800'
          : 'bg-amber-50 border border-amber-100 text-stone-700'
      )}>
        {/* Image thumbnail */}
        {message.imageData && (
          <div className="mb-2 rounded-lg overflow-hidden border border-stone-200">
            <img src={message.imageData} alt="Uploaded" className="w-full h-24 object-cover" />
          </div>
        )}

        {/* Text content - simple markdown-like rendering */}
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

// ── Data Panel Component ──
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
  return (
    <Card className="border-stone-200">
      <CardHeader
        className="p-3 cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-700" />
            <CardTitle className="text-xs font-semibold text-stone-800">
              {lang === 'en' ? 'Extracted Furniture Data' : 'Datos de Mobiliario Extraídos'}
            </CardTitle>
          </div>
          <ChevronDown className={cn(
            'w-4 h-4 text-stone-500 transition-transform',
            expanded && 'rotate-180'
          )} />
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="px-3 pb-3 space-y-2">
          {/* Product type & style */}
          <div className="grid grid-cols-2 gap-2">
            <DataBadge icon={<Layers className="w-3 h-3" />} label={lang === 'en' ? 'Type' : 'Tipo'} value={data.productType} />
            <DataBadge icon={<Sparkles className="w-3 h-3" />} label={lang === 'en' ? 'Style' : 'Estilo'} value={data.style} />
          </div>

          {/* Material & finish */}
          <div className="grid grid-cols-2 gap-2">
            <DataBadge icon={<Layers className="w-3 h-3" />} label={lang === 'en' ? 'Material' : 'Material'} value={data.material.main} />
            <DataBadge icon={<Palette className="w-3 h-3" />} label={lang === 'en' ? 'Finish' : 'Acabado'} value={data.finish} />
          </div>

          {/* Feature */}
          <div className="bg-stone-50 rounded-md p-2">
            <span className="text-[10px] text-stone-500 uppercase tracking-wide">
              {lang === 'en' ? 'Distinctive Feature' : 'Característica Distintiva'}
            </span>
            <p className="text-xs text-stone-800 font-medium mt-0.5">{data.feature}</p>
          </div>

          {/* Dimensions */}
          <div className="bg-stone-50 rounded-md p-2">
            <div className="flex items-center gap-1 mb-1">
              <Ruler className="w-3 h-3 text-stone-500" />
              <span className="text-[10px] text-stone-500 uppercase tracking-wide">
                {lang === 'en' ? 'Dimensions (cm)' : 'Dimensiones (cm)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>H: <strong>{data.dimensions.height}</strong></div>
              <div>W: <strong>{data.dimensions.width}</strong></div>
              <div>D: <strong>{data.dimensions.depth}</strong></div>
              {data.dimensions.seatHeight && (
                <div>Seat: <strong>{data.dimensions.seatHeight}</strong></div>
              )}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              {lang === 'en' ? 'Weight' : 'Peso'}: <strong>{data.weight} kg</strong>
            </div>
          </div>

          {/* Color palette */}
          <div className="flex gap-1">
            {Object.entries(data.colorPalette).map(([key, hex]) => (
              <div key={key} className="flex-1 text-center">
                <div
                  className="h-5 rounded-sm border border-stone-200"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-[8px] text-stone-500 mt-0.5 block">{key}</span>
              </div>
            ))}
          </div>

          {/* Annotations */}
          <div className="space-y-1">
            {data.annotations.map((ann, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-stone-600">
                <span className="text-amber-600 flex-shrink-0 mt-px">◈</span>
                {ann}
              </div>
            ))}
          </div>

          {/* JS Object Export */}
          <Separator />
          <div className="bg-stone-900 rounded-md p-2 overflow-x-auto">
            <pre className="text-[9px] text-green-400 font-mono whitespace-pre-wrap">
{`export const furnitureData = ${JSON.stringify(data, null, 2)};`}
            </pre>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Views Panel Component ──
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
    <Card className="border-stone-200">
      <CardHeader className="p-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-700" />
          <CardTitle className="text-xs font-semibold text-stone-800">
            {lang === 'en' ? 'Photorealistic Views' : 'Vistas Fotorrealistas'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(viewImages).map(([view, imageBase64]) => {
            if (!imageBase64) return null;
            const isExpanded = expandedView === view;

            return (
              <div
                key={view}
                className={cn(
                  'rounded-lg overflow-hidden border border-stone-200 cursor-pointer hover:border-amber-300 transition-all',
                  isExpanded && 'col-span-2'
                )}
                onClick={() => onExpand(isExpanded ? null : view)}
              >
                <img
                  src={`data:image/png;base64,${imageBase64}`}
                  alt={`${viewLabels[view] || view} view`}
                  className={cn('w-full object-cover', isExpanded ? 'h-48' : 'h-24')}
                />
                <div className="bg-stone-50 px-2 py-1 text-center">
                  <span className="text-[10px] font-medium text-stone-600">
                    {viewLabels[view] || view}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Data Badge ──
function DataBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-stone-50 rounded-md p-1.5 flex items-center gap-1.5">
      <span className="text-amber-600">{icon}</span>
      <div>
        <div className="text-[8px] text-stone-500 uppercase tracking-wide">{label}</div>
        <div className="text-[11px] font-medium text-stone-800 capitalize">{value}</div>
      </div>
    </div>
  );
}
