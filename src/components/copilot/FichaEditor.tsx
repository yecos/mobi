'use client';

import React from 'react';
import type { CopilotFurnitureData } from '@/lib/types';
import { useAppStore } from '@/store/app-store';
import {
  Ruler,
  Palette,
  Layers,
  Sparkles,
  Tag,
  Weight,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface FichaEditorProps {
  data: CopilotFurnitureData;
  lang: string;
}

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

export function FichaEditor({ data, lang }: FichaEditorProps) {
  const updateCopilotData = useAppStore((s) => s.updateCopilotData);
  const updateCopilotDimension = useAppStore((s) => s.updateCopilotDimension);
  const updateCopilotMaterial = useAppStore((s) => s.updateCopilotMaterial);
  const updateCopilotAnnotation = useAppStore((s) => s.updateCopilotAnnotation);
  const updateCopilotMaterialDetail = useAppStore((s) => s.updateCopilotMaterialDetail);
  const addCopilotMaterialDetail = useAppStore((s) => s.addCopilotMaterialDetail);
  const removeCopilotMaterialDetail = useAppStore((s) => s.removeCopilotMaterialDetail);
  const updateCopilotColor = useAppStore((s) => s.updateCopilotColor);

  const isES = lang === 'es';

  return (
    <div className="space-y-4">
      {/* ── Product Identity ── */}
      <Section title={isES ? 'Identidad del Producto' : 'Product Identity'} icon={<Tag className="w-3.5 h-3.5" />}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
              {isES ? 'Tipo de Producto' : 'Product Type'}
            </Label>
            <Select
              value={data.productType}
              onValueChange={(val) => updateCopilotData({ productType: val })}
            >
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs capitalize">
                    {isES ? translateType(t) : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
              {isES ? 'Estilo' : 'Style'}
            </Label>
            <Select
              value={data.style}
              onValueChange={(val) => updateCopilotData({ style: val })}
            >
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs capitalize">
                    {isES ? translateStyle(s) : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <Label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
              {isES ? 'Material Principal' : 'Main Material'}
            </Label>
            <Select
              value={data.material.main}
              onValueChange={(val) => updateCopilotMaterial({ main: val })}
            >
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIALS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs capitalize">
                    {isES ? translateMaterial(m) : m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
              {isES ? 'Acabado' : 'Finish'}
            </Label>
            <Select
              value={data.finish}
              onValueChange={(val) => updateCopilotData({ finish: val })}
            >
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINISHES.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs capitalize">
                    {isES ? translateFinish(f) : f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <Label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
            {isES ? 'Característica Distintiva' : 'Distinctive Feature'}
          </Label>
          <Input
            value={data.feature}
            onChange={(e) => updateCopilotData({ feature: e.target.value })}
            className="h-8 text-xs mt-1"
            placeholder={isES ? 'Ej: asiento de cuerda tejida, modular, almacenamiento...' : 'e.g. woven cane seat, modularity, storage...'}
          />
        </div>
      </Section>

      {/* ── Dimensions ── */}
      <Section title={isES ? 'Dimensiones (cm)' : 'Dimensions (cm)'} icon={<Ruler className="w-3.5 h-3.5" />}>
        <div className="grid grid-cols-2 gap-3">
          <DimensionField
            label={isES ? 'Altura' : 'Height'}
            value={data.dimensions.height}
            onChange={(v) => updateCopilotDimension('height', v)}
            unit="cm"
          />
          <DimensionField
            label={isES ? 'Ancho' : 'Width'}
            value={data.dimensions.width}
            onChange={(v) => updateCopilotDimension('width', v)}
            unit="cm"
          />
          <DimensionField
            label={isES ? 'Profundidad' : 'Depth'}
            value={data.dimensions.depth}
            onChange={(v) => updateCopilotDimension('depth', v)}
            unit="cm"
          />
          <DimensionField
            label={isES ? 'Altura Asiento' : 'Seat Height'}
            value={data.dimensions.seatHeight ?? 0}
            onChange={(v) => updateCopilotDimension('seatHeight', v || null)}
            unit="cm"
            nullable
          />
        </div>
        <div className="mt-3">
          <DimensionField
            label={isES ? 'Peso' : 'Weight'}
            value={data.weight}
            onChange={(v) => updateCopilotData({ weight: v })}
            unit="kg"
          />
        </div>
      </Section>

      {/* ── Material Details ── */}
      <Section title={isES ? 'Detalles de Material' : 'Material Details'} icon={<Layers className="w-3.5 h-3.5" />}>
        <div className="space-y-2">
          {data.material.details.map((detail, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
              <Input
                value={detail}
                onChange={(e) => updateCopilotMaterialDetail(i, e.target.value)}
                className="h-7 text-xs flex-1"
                placeholder={`${isES ? 'Detalle' : 'Detail'} ${i + 1}`}
              />
              {data.material.details.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                  onClick={() => removeCopilotMaterialDetail(i)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-purple-600 hover:text-purple-800 gap-1"
            onClick={addCopilotMaterialDetail}
          >
            <Plus className="w-3 h-3" />
            {isES ? 'Agregar detalle' : 'Add detail'}
          </Button>
        </div>
      </Section>

      {/* ── Annotations / Design Highlights ── */}
      <Section title={isES ? 'Anotaciones de Diseño' : 'Design Highlights'} icon={<Sparkles className="w-3.5 h-3.5" />}>
        <div className="space-y-2">
          {data.annotations.map((ann, i) => {
            const labels = isES
              ? ['Textura / Material', 'Estructura / Ensamblaje', 'Funcional / Destacado']
              : ['Texture / Material', 'Structure / Joinery', 'Functional / Highlight'];
            const icons = ['◈', '⬡', '◆'];
            return (
              <div key={i} className="flex items-start gap-2">
                <span className="text-purple-500 text-sm mt-1.5 flex-shrink-0">{icons[i] || '•'}</span>
                <div className="flex-1">
                  <Label className="text-[9px] text-gray-400 uppercase tracking-wide font-medium">
                    {labels[i] || `${isES ? 'Detalle' : 'Detail'} ${i + 1}`}
                  </Label>
                  <Input
                    value={ann}
                    onChange={(e) => updateCopilotAnnotation(i, e.target.value)}
                    className="h-7 text-xs mt-0.5"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Color Palette ── */}
      <Section title={isES ? 'Paleta de Colores' : 'Color Palette'} icon={<Palette className="w-3.5 h-3.5" />}>
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            label={isES ? 'Color Material' : 'Material Color'}
            value={data.colorPalette.primary}
            onChange={(v) => updateCopilotColor('primary', v)}
          />
          <ColorField
            label={isES ? 'Color Destacado' : 'Feature Color'}
            value={data.colorPalette.secondary}
            onChange={(v) => updateCopilotColor('secondary', v)}
          />
          <ColorField
            label="Pearl Gray"
            value={data.colorPalette.pearlGray}
            onChange={(v) => updateCopilotColor('pearlGray', v)}
          />
          <ColorField
            label="Dark Gray"
            value={data.colorPalette.darkGray}
            onChange={(v) => updateCopilotColor('darkGray', v)}
          />
        </div>
        {/* Palette Preview */}
        <div className="flex gap-1.5 mt-3">
          {Object.entries(data.colorPalette).map(([key, hex]) => (
            <div key={key} className="flex-1 text-center">
              <div
                className="h-8 rounded-lg border border-gray-200 shadow-sm transition-colors"
                style={{ backgroundColor: hex }}
              />
              <span className="text-[8px] text-gray-400 mt-0.5 block font-mono">{hex}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Sub-components ──

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
        <span className="text-purple-500">{icon}</span>
        <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">{title}</span>
      </div>
      <div className="px-3 py-3">
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
}: {
  label: string;
  value: number | null;
  onChange: (val: number | null) => void;
  unit: string;
  nullable?: boolean;
}) {
  return (
    <div>
      <Label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</Label>
      <div className="flex items-center gap-1 mt-1">
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
          className="h-8 text-xs flex-1"
          min={0}
          step={0.1}
        />
        <span className="text-[10px] text-gray-400 font-medium w-6">{unit}</span>
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
      <Label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs flex-1 font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

// ── Translation helpers ──

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
