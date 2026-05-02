'use client';

import React from 'react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import type { FurnitureData, Dimensions } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { BrandInfoCard } from './BrandInfoCard';
import { ColorFinishesCard } from './ColorFinishesCard';
import { StyleInfoCard } from './StyleInfoCard';
import { ProductDetailsCard } from './ProductDetailsCard';
import { DimensionsCard } from './DimensionsCard';
import { MaterialsCard } from './MaterialsCard';
import { LoungeConfigsCard } from './LoungeConfigsCard';
import { TagsCard } from './TagsCard';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditingViewProps {
  furnitureData: FurnitureData;
  imagePreview: string | null;
  lang: Lang;
  unitMode: 'imperial' | 'metric';
  catalogCount: number;
  onUpdateField: (field: keyof FurnitureData, value: unknown) => void;
  onSetUnitMode: (mode: 'imperial' | 'metric') => void;
  onAddToCatalog: () => void;
  onStartOver: () => void;
  onGeneratePDFs: () => void;
  onGenerateCombined: () => void;
  onGenerateCatalog: () => void;
  renderDimensionInput: (label: string, dimKey: keyof Dimensions, required?: boolean) => React.ReactNode;
}

export function EditingView({
  furnitureData,
  imagePreview,
  lang,
  unitMode,
  catalogCount,
  onUpdateField,
  onSetUnitMode,
  onAddToCatalog,
  onStartOver,
  onGeneratePDFs,
  onGenerateCombined,
  onGenerateCatalog,
  renderDimensionInput,
}: EditingViewProps) {
  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image & Brand Info */}
        <div className="space-y-4">
          {/* Image Preview */}
          <Card className="border-stone-200 overflow-hidden">
            <CardContent className="p-0">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt={furnitureData.productName}
                  className="w-full h-56 object-contain bg-stone-50 p-2"
                />
              )}
            </CardContent>
          </Card>

          <BrandInfoCard furnitureData={furnitureData} onUpdateField={onUpdateField} lang={lang} />
          <ColorFinishesCard furnitureData={furnitureData} onUpdateField={onUpdateField} lang={lang} />
          <StyleInfoCard furnitureData={furnitureData} onUpdateField={onUpdateField} lang={lang} />
        </div>

        {/* Right: Form Fields */}
        <div className="lg:col-span-2 space-y-4">
          <ProductDetailsCard furnitureData={furnitureData} onUpdateField={onUpdateField} lang={lang} />
          <DimensionsCard
            lang={lang}
            unitMode={unitMode}
            onSetUnitMode={onSetUnitMode}
            renderDimensionInput={renderDimensionInput}
          />
          <MaterialsCard furnitureData={furnitureData} onUpdateField={onUpdateField} lang={lang} />
          <LoungeConfigsCard furnitureData={furnitureData} onUpdateField={onUpdateField} lang={lang} />
          <TagsCard furnitureData={furnitureData} onUpdateField={onUpdateField} lang={lang} />

          {/* Generate Button */}
          <div className="flex justify-end pt-2 pb-6">
            <Button
              size="lg"
              className="bg-amber-800 hover:bg-amber-900 text-white px-10"
              onClick={onGeneratePDFs}
            >
              <FileText className="w-5 h-5 mr-2" />
              {t(lang, 'editing.generatePdfSpecs')}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
