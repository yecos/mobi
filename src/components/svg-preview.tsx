'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SvgPreviewProps {
  svgViews: { plant: string | null; frontal: string | null; lateral: string | null };
  className?: string;
}

export function SvgPreview({ svgViews, className }: SvgPreviewProps) {
  const views = [
    { key: 'frontal' as const, label: 'FRONTAL' },
    { key: 'lateral' as const, label: 'LATERAL' },
    { key: 'plant' as const, label: 'PLANTA' },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className || ''}`}>
      {views.map(({ key, label }) => (
        <Card key={key} className="border-stone-200">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-semibold text-stone-500 tracking-wider">{label}</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {svgViews[key] ? (
              <div
                className="w-full [&>svg]:w-full [&>svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: svgViews[key]! }}
              />
            ) : (
              <div className="w-full h-40 bg-stone-50 flex items-center justify-center text-stone-400 text-sm">
                Vista no disponible
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
