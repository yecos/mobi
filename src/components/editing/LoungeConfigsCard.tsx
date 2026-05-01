'use client';

import React, { useState } from 'react';
import { Package, Hash, Plus, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import type { FurnitureData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LoungeConfigsCardProps {
  furnitureData: FurnitureData;
  onUpdateField: (field: keyof FurnitureData, value: unknown) => void;
  lang: Lang;
}

export function LoungeConfigsCard({ furnitureData, onUpdateField, lang }: LoungeConfigsCardProps) {
  const [newLoungeName, setNewLoungeName] = useState('');
  const [newLoungeUnits, setNewLoungeUnits] = useState(1);

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-700" />
          {t(lang, 'editing.loungeConfigs')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {furnitureData.loungeConfigurations.map((lc, i) => (
          <div key={i} className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-stone-400" />
            <Input
              value={lc.name}
              onChange={(e) => {
                const updated = [...furnitureData.loungeConfigurations];
                updated[i] = { ...updated[i], name: e.target.value };
                onUpdateField('loungeConfigurations', updated);
              }}
              className="h-8 text-sm flex-1"
              placeholder={t(lang, 'editing.configName')}
            />
            <Input
              type="number"
              min={1}
              value={lc.units}
              onChange={(e) => {
                const updated = [...furnitureData.loungeConfigurations];
                updated[i] = { ...updated[i], units: parseInt(e.target.value) || 1 };
                onUpdateField('loungeConfigurations', updated);
              }}
              className="h-8 text-sm w-20 text-center"
            />
            <button
              onClick={() => {
                const updated = furnitureData.loungeConfigurations.filter((_, idx) => idx !== i);
                onUpdateField('loungeConfigurations', updated);
              }}
              className="text-stone-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-stone-300" />
          <Input
            value={newLoungeName}
            onChange={(e) => setNewLoungeName(e.target.value)}
            placeholder={t(lang, 'editing.configName')}
            className="h-8 text-sm flex-1"
          />
          <Input
            type="number"
            min={1}
            value={newLoungeUnits}
            onChange={(e) => setNewLoungeUnits(parseInt(e.target.value) || 1)}
            className="h-8 text-sm w-20 text-center"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              if (newLoungeName) {
                onUpdateField('loungeConfigurations', [
                  ...furnitureData.loungeConfigurations,
                  { name: newLoungeName, units: newLoungeUnits },
                ]);
                setNewLoungeName('');
                setNewLoungeUnits(1);
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
