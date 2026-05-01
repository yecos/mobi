'use client';

import React, { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import type { FurnitureData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TagsCardProps {
  furnitureData: FurnitureData;
  onUpdateField: (field: keyof FurnitureData, value: unknown) => void;
  lang: Lang;
}

export function TagsCard({ furnitureData, onUpdateField, lang }: TagsCardProps) {
  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    if (newTag) {
      onUpdateField('tags', [...furnitureData.tags, newTag]);
      setNewTag('');
    }
  };

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-700" />
          {t(lang, 'editing.tags')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {furnitureData.tags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-stone-600 pr-1">
              #{tag}
              <button
                onClick={() => {
                  const updated = furnitureData.tags.filter((_, idx) => idx !== i);
                  onUpdateField('tags', updated);
                }}
                className="ml-1.5 w-4 h-4 rounded-full hover:bg-stone-200 inline-flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder={t(lang, 'editing.addTag')}
            className="h-9 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTag();
            }}
          />
          <Button size="sm" variant="outline" className="h-9" onClick={addTag}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
