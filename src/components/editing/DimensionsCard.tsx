'use client';

import React from 'react';
import { Ruler } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Dimensions } from '@/lib/types';

interface DimensionsCardProps {
  lang: Lang;
  unitMode: 'imperial' | 'metric';
  onSetUnitMode: (mode: 'imperial' | 'metric') => void;
  renderDimensionInput: (label: string, dimKey: keyof Dimensions, required?: boolean) => React.ReactNode;
}

export function DimensionsCard({ lang, unitMode, onSetUnitMode, renderDimensionInput }: DimensionsCardProps) {
  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-amber-700" />
            {t(lang, 'editing.dimensions')}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSetUnitMode(unitMode === 'imperial' ? 'metric' : 'imperial')}
          >
            {unitMode === 'imperial' ? 'ft/in → m' : 'm → ft/in'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {renderDimensionInput(t(lang, 'editing.height'), 'height', true)}
          {renderDimensionInput(t(lang, 'editing.width'), 'width', true)}
          {renderDimensionInput(t(lang, 'editing.depth'), 'depth', true)}
          {renderDimensionInput(t(lang, 'editing.widthExtended'), 'widthExtended')}
          {renderDimensionInput(t(lang, 'editing.seatDepth'), 'seatDepth')}
          {renderDimensionInput(t(lang, 'editing.depthExtended'), 'depthExtended')}
        </div>
      </CardContent>
    </Card>
  );
}
