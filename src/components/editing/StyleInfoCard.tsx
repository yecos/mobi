'use client';

import React from 'react';
import { Palette } from 'lucide-react';
import type { Lang } from '@/lib/i18n';
import type { FurnitureData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STYLE_OPTIONS = ['Modern', 'Classic', 'Minimalist', 'Industrial', 'Scandinavian', 'Rustic'];

interface StyleInfoCardProps {
  furnitureData: FurnitureData;
  onUpdateField: (field: keyof FurnitureData, value: unknown) => void;
  lang: Lang;
}

export function StyleInfoCard({ furnitureData, onUpdateField, lang }: StyleInfoCardProps) {
  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-700" />
          {lang === 'en' ? 'Style & Finish' : 'Estilo y Acabado'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-stone-500">
            {lang === 'en' ? 'Style' : 'Estilo'}
          </Label>
          <Select
            value={furnitureData.style || ''}
            onValueChange={(value) => onUpdateField('style', value)}
          >
            <SelectTrigger className="h-9 mt-1">
              <SelectValue placeholder={lang === 'en' ? 'Select style...' : 'Seleccionar estilo...'} />
            </SelectTrigger>
            <SelectContent>
              {STYLE_OPTIONS.map((style) => (
                <SelectItem key={style} value={style.toLowerCase()}>
                  {lang === 'es' ? 
                    { modern: 'Moderno', classic: 'Clásico', minimalist: 'Minimalista', industrial: 'Industrial', scandinavian: 'Escandinavo', rustic: 'Rústico' }[style.toLowerCase()] || style
                    : style
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-stone-500">
            {lang === 'en' ? 'Finish / Color' : 'Acabado / Color'}
          </Label>
          <Input
            value={furnitureData.finish || ''}
            onChange={(e) => onUpdateField('finish', e.target.value)}
            className="h-9 mt-1"
            placeholder={lang === 'en' ? 'e.g. Natural Walnut' : 'ej. Nogal Natural'}
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500">
            {lang === 'en' ? 'Special Feature' : 'Característica Especial'}
          </Label>
          <Input
            value={furnitureData.specialFeature || ''}
            onChange={(e) => onUpdateField('specialFeature', e.target.value)}
            className="h-9 mt-1"
            placeholder={lang === 'en' ? 'e.g. L-shaped, reclining' : 'ej. Forma L, reclinable'}
          />
        </div>
      </CardContent>
    </Card>
  );
}
