'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import type { FurnitureData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BrandInfoCardProps {
  furnitureData: FurnitureData;
  onUpdateField: (field: keyof FurnitureData, value: unknown) => void;
  lang: Lang;
}

export function BrandInfoCard({ furnitureData, onUpdateField, lang }: BrandInfoCardProps) {
  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-700" />
          {t(lang, 'editing.brandInfo')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-stone-500">{t(lang, 'editing.brandName')}</Label>
          <Input
            value={furnitureData.brand}
            onChange={(e) => onUpdateField('brand', e.target.value)}
            className="h-9 mt-1"
            placeholder={t(lang, 'editing.brandNamePlaceholder')}
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500">{t(lang, 'editing.referenceNumber')}</Label>
          <Input
            value={furnitureData.referenceNumber}
            onChange={(e) => onUpdateField('referenceNumber', e.target.value)}
            className="h-9 mt-1"
            placeholder="REF-001"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500">{t(lang, 'editing.category')}</Label>
          <Input
            value={furnitureData.category}
            onChange={(e) => onUpdateField('category', e.target.value)}
            className="h-9 mt-1"
            placeholder={t(lang, 'editing.categoryPlaceholder')}
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500">{t(lang, 'editing.quantity')}</Label>
          <Input
            type="number"
            min={1}
            value={furnitureData.quantity}
            onChange={(e) => onUpdateField('quantity', parseInt(e.target.value) || 1)}
            className="h-9 mt-1 w-24"
          />
        </div>
      </CardContent>
    </Card>
  );
}
