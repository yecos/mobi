'use client';

import React, { useState } from 'react';
import { Layers, Plus, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import type { FurnitureData, MaterialItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MaterialsCardProps {
  furnitureData: FurnitureData;
  onUpdateField: (field: keyof FurnitureData, value: unknown) => void;
  lang: Lang;
}

/** Normalize materials to MaterialItem[] — handles legacy string[] format */
function normalizeMaterials(materials: MaterialItem[] | string[]): MaterialItem[] {
  if (!materials || materials.length === 0) return [];
  // If first item is a string, convert all
  if (typeof materials[0] === 'string') {
    return (materials as unknown as string[]).map((m) => ({
      material: m,
      quantity: 1,
      description: '',
      observations: '',
    }));
  }
  return materials as MaterialItem[];
}

export function MaterialsCard({ furnitureData, onUpdateField, lang }: MaterialsCardProps) {
  const materials = normalizeMaterials(furnitureData.materials);
  const [newMaterial, setNewMaterial] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');

  const addMaterial = () => {
    if (newMaterial.trim()) {
      const newItem: MaterialItem = {
        material: newMaterial.trim(),
        quantity: parseFloat(newQuantity) || 1,
        description: '',
        observations: '',
      };
      onUpdateField('materials', [...materials, newItem]);
      setNewMaterial('');
      setNewQuantity('1');
    }
  };

  const removeMaterial = (index: number) => {
    const updated = materials.filter((_, idx) => idx !== index);
    onUpdateField('materials', updated);
  };

  const updateMaterialField = (index: number, field: keyof MaterialItem, value: string | number) => {
    const updated = materials.map((item, idx) => {
      if (idx !== index) return item;
      return { ...item, [field]: value };
    });
    onUpdateField('materials', updated);
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
        {/* Existing materials */}
        {materials.length > 0 && (
          <div className="space-y-2">
            {materials.map((mat, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100">
                <Badge variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200 shrink-0">
                  {mat.material}
                </Badge>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={mat.quantity}
                  onChange={(e) => updateMaterialField(i, 'quantity', parseFloat(e.target.value) || 0)}
                  className="h-7 w-16 text-xs text-center"
                />
                <Input
                  value={mat.description || ''}
                  onChange={(e) => updateMaterialField(i, 'description', e.target.value)}
                  placeholder={lang === 'en' ? 'Description' : 'Descripción'}
                  className="h-7 text-xs flex-1"
                />
                <button
                  onClick={() => removeMaterial(i)}
                  className="w-5 h-5 rounded-full hover:bg-stone-200 inline-flex items-center justify-center shrink-0"
                >
                  <X className="w-3 h-3 text-stone-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new material */}
        <div className="flex gap-2">
          <Input
            value={newMaterial}
            onChange={(e) => setNewMaterial(e.target.value)}
            placeholder={t(lang, 'editing.addMaterial')}
            className="h-9 text-sm flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMaterial();
            }}
          />
          <Input
            type="number"
            min="0"
            step="0.1"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            className="h-9 w-16 text-sm text-center"
            title={lang === 'en' ? 'Quantity' : 'Cantidad'}
          />
          <Button size="sm" variant="outline" className="h-9" onClick={addMaterial}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
