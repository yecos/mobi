'use client';

import React, { useState } from 'react';
import { Palette, Plus, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import type { FurnitureData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ColorFinishesCardProps {
  furnitureData: FurnitureData;
  onUpdateField: (field: keyof FurnitureData, value: unknown) => void;
  lang: Lang;
}

export function ColorFinishesCard({ furnitureData, onUpdateField, lang }: ColorFinishesCardProps) {
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-700" />
          {t(lang, 'editing.colorFinish')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {furnitureData.colorFinishes.map((cf, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full border-2 border-stone-200 flex-shrink-0"
              style={{ backgroundColor: cf.color }}
            />
            <Input
              value={cf.name}
              onChange={(e) => {
                const updated = [...furnitureData.colorFinishes];
                updated[i] = { ...updated[i], name: e.target.value };
                onUpdateField('colorFinishes', updated);
              }}
              className="h-8 text-sm flex-1"
            />
            <Input
              type="color"
              value={cf.color}
              onChange={(e) => {
                const updated = [...furnitureData.colorFinishes];
                updated[i] = { ...updated[i], color: e.target.value };
                onUpdateField('colorFinishes', updated);
              }}
              className="w-8 h-8 p-0 border-0 cursor-pointer"
            />
            <button
              onClick={() => {
                const updated = furnitureData.colorFinishes.filter((_, idx) => idx !== i);
                onUpdateField('colorFinishes', updated);
              }}
              className="text-stone-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            placeholder={t(lang, 'editing.colorName')}
            className="h-8 text-sm flex-1"
          />
          <Input
            type="color"
            value={newColorHex}
            onChange={(e) => setNewColorHex(e.target.value)}
            className="w-8 h-8 p-0 border-0 cursor-pointer"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              if (newColorName) {
                onUpdateField('colorFinishes', [
                  ...furnitureData.colorFinishes,
                  { name: newColorName, color: newColorHex },
                ]);
                setNewColorName('');
                setNewColorHex('#000000');
              }
            }}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
