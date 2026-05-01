'use client';

import React from 'react';
import { t, type Lang } from '@/lib/i18n';
import { Sofa, Armchair, Table, Bed, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FurnitureData } from '@/lib/types';

interface SampleShowcaseProps {
  lang: Lang;
  onLoadSample: (data: FurnitureData) => void;
}

const sampleFurniture: Array<{
  id: string;
  name: string;
  nameEs: string;
  category: string;
  categoryEs: string;
  icon: React.ElementType;
  data: Partial<FurnitureData>;
  color: string;
  bgColor: string;
}> = [
  {
    id: 'sofa',
    name: 'Modern Sofa',
    nameEs: 'Sofá Moderno',
    category: 'Sofa',
    categoryEs: 'Sofá',
    icon: Sofa,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    data: {
      productName: 'Modern Sofa',
      brand: 'TEMPLO',
      referenceNumber: 'SOF-2024-001',
      category: 'Sofa',
      description: 'Three-seater sofa with solid oak legs and high-resilience foam cushions. Upholstered in premium Italian linen blend fabric.',
      materials: ['Solid Oak', 'High-resilience Foam', 'Italian Linen Blend'],
      dimensions: {
        height: { feet: 2, inches: 8 },
        width: { feet: 7, inches: 6 },
        depth: { feet: 3, inches: 3 },
        widthExtended: { feet: 0, inches: 0 },
        seatDepth: { feet: 2, inches: 4 },
        depthExtended: { feet: 0, inches: 0 },
      },
      colorFinishes: [{ name: 'Charcoal', color: '#374151' }, { name: 'Sand', color: '#d6d3d1' }],
      loungeConfigurations: [{ name: '3-Seater', units: 1 }],
      tags: ['Living Room', 'Modern', 'Upholstered'],
      quantity: 1,
    },
  },
  {
    id: 'armchair',
    name: 'Lounge Chair',
    nameEs: 'Sillón Lounge',
    category: 'Chair',
    categoryEs: 'Silla',
    icon: Armchair,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    data: {
      productName: 'Lounge Chair',
      brand: 'TEMPLO',
      referenceNumber: 'CHR-2024-042',
      category: 'Chair',
      description: 'Ergonomic lounge chair with walnut frame and leather upholstery. Mid-century modern design with adjustable headrest.',
      materials: ['Walnut Wood', 'Full-grain Leather', 'Brass Hardware'],
      dimensions: {
        height: { feet: 3, inches: 2 },
        width: { feet: 2, inches: 9 },
        depth: { feet: 2, inches: 11 },
        widthExtended: { feet: 0, inches: 0 },
        seatDepth: { feet: 1, inches: 9 },
        depthExtended: { feet: 0, inches: 0 },
      },
      colorFinishes: [{ name: 'Walnut', color: '#5c4033' }, { name: 'Black Leather', color: '#1a1a1a' }],
      loungeConfigurations: [{ name: 'Single', units: 1 }],
      tags: ['Living Room', 'Mid-century', 'Leather'],
      quantity: 2,
    },
  },
  {
    id: 'table',
    name: 'Dining Table',
    nameEs: 'Mesa de Comedor',
    category: 'Table',
    categoryEs: 'Mesa',
    icon: Table,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    data: {
      productName: 'Dining Table',
      brand: 'TEMPLO',
      referenceNumber: 'TBL-2024-015',
      category: 'Table',
      description: 'Extendable dining table in white oak with ceramic top. Seats 6-10 people. Minimalist Scandinavian design.',
      materials: ['White Oak', 'Ceramic Top', 'Steel Base'],
      dimensions: {
        height: { feet: 2, inches: 6 },
        width: { feet: 6, inches: 7 },
        depth: { feet: 3, inches: 3 },
        widthExtended: { feet: 8, inches: 10 },
        seatDepth: { feet: 0, inches: 0 },
        depthExtended: { feet: 0, inches: 0 },
      },
      colorFinishes: [{ name: 'Natural Oak', color: '#c4a77d' }, { name: 'White Ceramic', color: '#f5f5f5' }],
      loungeConfigurations: [{ name: 'Standard', units: 1 }, { name: 'Extended', units: 1 }],
      tags: ['Dining', 'Scandinavian', 'Extendable'],
      quantity: 1,
    },
  },
  {
    id: 'bed',
    name: 'Platform Bed',
    nameEs: 'Cama Plataforma',
    category: 'Bed',
    categoryEs: 'Cama',
    icon: Bed,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    data: {
      productName: 'Platform Bed',
      brand: 'TEMPLO',
      referenceNumber: 'BED-2024-008',
      category: 'Bed',
      description: 'King-size platform bed with integrated nightstands. Upholstered headboard in bouclé fabric. Storage drawers underneath.',
      materials: ['Bouclé Fabric', 'Plywood Frame', 'Metal Slats'],
      dimensions: {
        height: { feet: 3, inches: 7 },
        width: { feet: 6, inches: 8 },
        depth: { feet: 7, inches: 2 },
        widthExtended: { feet: 0, inches: 0 },
        seatDepth: { feet: 0, inches: 0 },
        depthExtended: { feet: 0, inches: 0 },
      },
      colorFinishes: [{ name: 'Ivory', color: '#fffff0' }, { name: 'Taupe', color: '#8b7e74' }],
      loungeConfigurations: [{ name: 'King', units: 1 }],
      tags: ['Bedroom', 'Platform', 'Storage'],
      quantity: 1,
    },
  },
];

export function SampleShowcase({ lang, onLoadSample }: SampleShowcaseProps) {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 mb-4">
            <Sparkles className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-600">
              {lang === 'en' ? 'Try Without Uploading' : 'Prueba Sin Subir Imagen'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-3">
            {lang === 'en' ? 'Example Furniture Specs' : 'Ejemplos de Fichas'}
          </h2>
          <p className="text-stone-500 max-w-lg mx-auto">
            {lang === 'en'
              ? 'Click on any example to load pre-filled data and see how the spec sheets look.'
              : 'Haz clic en cualquier ejemplo para cargar datos prellenados y ver cómo se ven las fichas.'}
          </p>
        </div>

        {/* Sample cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sampleFurniture.map((item) => {
            const Icon = item.icon;
            const displayName = lang === 'en' ? item.name : item.nameEs;
            const displayCategory = lang === 'en' ? item.category : item.categoryEs;

            return (
              <button
                key={item.id}
                onClick={() => onLoadSample(item.data as FurnitureData)}
                className="group relative flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-stone-200 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50 transition-all duration-300 hover:-translate-y-1 text-left"
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl ${item.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 ${item.color}`} />
                </div>

                {/* Content */}
                <h3 className="font-bold text-stone-900 mb-1">{displayName}</h3>
                <p className="text-sm text-stone-500 mb-3">{displayCategory}</p>

                {/* Quick stats */}
                <div className="w-full space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400">{t(lang, 'editing.width')}</span>
                    <span className="font-medium text-stone-700">
                      {item.data.dimensions?.width?.feet}&apos;{item.data.dimensions?.width?.inches}&quot;
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400">{t(lang, 'editing.height')}</span>
                    <span className="font-medium text-stone-700">
                      {item.data.dimensions?.height?.feet}&apos;{item.data.dimensions?.height?.inches}&quot;
                    </span>
                  </div>
                </div>

                {/* Materials preview */}
                <div className="flex flex-wrap gap-1 justify-center mb-4">
                  {item.data.materials?.slice(0, 2).map((m) => (
                    <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {m}
                    </span>
                  ))}
                  {(item.data.materials?.length || 0) > 2 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-400">
                      +{(item.data.materials?.length || 0) - 2}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-auto w-full">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 group-hover:text-amber-800 transition-colors">
                    {lang === 'en' ? 'Load Spec' : 'Cargar Ficha'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
