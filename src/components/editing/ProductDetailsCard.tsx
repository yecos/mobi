'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import type { FurnitureData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProductDetailsCardProps {
  furnitureData: FurnitureData;
  onUpdateField: (field: keyof FurnitureData, value: unknown) => void;
  lang: Lang;
}

export function ProductDetailsCard({ furnitureData, onUpdateField, lang }: ProductDetailsCardProps) {
  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-700" />
          {t(lang, 'editing.productDetails')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-stone-500">{t(lang, 'editing.productName')}</Label>
          <Input
            value={furnitureData.productName}
            onChange={(e) => onUpdateField('productName', e.target.value)}
            className="h-9 mt-1"
            placeholder="Modern Lounge Chair"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500">{t(lang, 'editing.description')}</Label>
          <Input
            value={furnitureData.description}
            onChange={(e) => onUpdateField('description', e.target.value)}
            className="h-9 mt-1"
            placeholder="Detailed description..."
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500">{t(lang, 'editing.descriptionEs')}</Label>
          <Input
            value={furnitureData.descriptionEs}
            onChange={(e) => onUpdateField('descriptionEs', e.target.value)}
            className="h-9 mt-1"
            placeholder="Descripción detallada..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
