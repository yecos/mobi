'use client';

import React from 'react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { SvgPreview } from '@/components/svg-preview';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ArrowLeft, Save } from 'lucide-react';
import type { FurnitureData } from '@/lib/types';

interface ApprovalViewProps {
  furnitureData: FurnitureData;
  svgViews: { plant: string | null; frontal: string | null; lateral: string | null };
  lang: Lang;
  onApprove: () => void;
  onReject: () => void;
  isSaving?: boolean;
  conceptImageBase64?: string | null;
}

export function ApprovalView({ furnitureData, svgViews, lang, onApprove, onReject, isSaving, conceptImageBase64 }: ApprovalViewProps) {
  const widthCm = ((furnitureData.dimensions.width.feet * 12 + furnitureData.dimensions.width.inches) * 2.54).toFixed(0);
  const heightCm = ((furnitureData.dimensions.height.feet * 12 + furnitureData.dimensions.height.inches) * 2.54).toFixed(0);

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-3">
          <CheckCircle2 className="w-6 h-6 text-amber-700" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">
          {t(lang, 'approval.title')}
        </h2>
        <p className="text-stone-500 mt-1">
          {t(lang, 'approval.subtitle')}
        </p>
      </div>

      <SvgPreview svgViews={svgViews} className="mb-6" />

      {/* AI Concept Sketch */}
      {conceptImageBase64 && (
        <Card className="border-stone-200 mb-6">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-stone-800 mb-2">
              {lang === 'en' ? 'AI Concept Sketch' : 'Boceto AI'}
            </h3>
            <img
              src={`data:image/png;base64,${conceptImageBase64}`}
              alt="AI Concept"
              className="w-full max-w-md mx-auto rounded border border-stone-200"
            />
          </CardContent>
        </Card>
      )}

      {/* Furniture info summary */}
      <Card className="border-stone-200 mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-stone-500 text-xs">{t(lang, 'complete.product')}</span>
              <p className="font-semibold">{furnitureData.productName}</p>
            </div>
            <div>
              <span className="text-stone-500 text-xs">{t(lang, 'editing.category')}</span>
              <p className="font-semibold">{furnitureData.category}</p>
            </div>
            <div>
              <span className="text-stone-500 text-xs">{t(lang, 'editing.width')}</span>
              <p className="font-semibold">{widthCm} cm</p>
            </div>
            <div>
              <span className="text-stone-500 text-xs">{t(lang, 'editing.height')}</span>
              <p className="font-semibold">{heightCm} cm</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" size="lg" onClick={onReject} className="text-stone-600">
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t(lang, 'approval.reject')}
        </Button>
        <Button size="lg" className="bg-amber-800 hover:bg-amber-900 text-white px-8" onClick={onApprove} disabled={isSaving}>
          <Save className="w-5 h-5 mr-2" />
          {isSaving ? '...' : t(lang, 'approval.approve')}
        </Button>
      </div>
    </main>
  );
}
