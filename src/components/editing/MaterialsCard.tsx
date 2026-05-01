'use client';

import React, { useState } from 'react';
import { Layers, Plus, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import type { FurnitureData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MaterialsCardProps {
  furnitureData: FurnitureData;
  onUpdateField: (field: keyof FurnitureData, value: unknown) => void;
  lang: Lang;
}

export function MaterialsCard({ furnitureData, onUpdateField, lang }: MaterialsCardProps) {
  const [newMaterial, setNewMaterial] = useState('');

  const addMaterial = () => {
    if (newMaterial) {
      onUpdateField('materials', [...furnitureData.materials, newMaterial]);
      setNewMaterial('');
    }
  };

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-700" />
          {t(lang, 'editing.materials')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {furnitureData.materials.map((mat, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="bg-amber-50 text-amber-800 border-amber-200 pr-1"
            >
              {mat}
              <button
                onClick={() => {
                  const updated = furnitureData.materials.filter((_, idx) => idx !== i);
                  onUpdateField('materials', updated);
                }}
                className="ml-1.5 w-4 h-4 rounded-full hover:bg-amber-200 inline-flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newMaterial}
            onChange={(e) => setNewMaterial(e.target.value)}
            placeholder={t(lang, 'editing.addMaterial')}
            className="h-9 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMaterial();
            }}
          />
          <Button size="sm" variant="outline" className="h-9" onClick={addMaterial}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
