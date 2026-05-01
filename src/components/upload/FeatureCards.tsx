'use client';

import React from 'react';
import { t, type Lang } from '@/lib/i18n';
import { Eye, Ruler, FileText, Shield, Zap, Globe } from 'lucide-react';

interface FeatureCardsProps {
  lang: Lang;
}

const features = [
  {
    icon: Eye,
    titleEn: 'AI Vision Analysis',
    descEn: 'Identifies materials, dimensions, styles and finishes from a single photo',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    icon: Ruler,
    titleEn: 'Dual Unit System',
    descEn: 'Simultaneous metric and imperial measurements with automatic conversion',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: FileText,
    titleEn: 'Professional PDFs',
    descEn: 'Print-ready specification sheets with blueprints and details',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    icon: Shield,
    titleEn: 'Private & Secure',
    descEn: 'All processing happens in your browser and on secure servers',
    titleEs: 'Privado y Seguro',
    descEs: 'Todo el procesamiento ocurre en tu navegador y servidores seguros',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
  },
  {
    icon: Zap,
    titleEn: 'Fast Processing',
    descEn: 'AI analysis completes in under 30 seconds',
    titleEs: 'Procesamiento Rápido',
    descEs: 'Análisis IA completo en menos de 30 segundos',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
  },
  {
    icon: Globe,
    titleEn: 'Bilingual',
    descEn: 'Full support for English and Spanish',
    titleEs: 'Bilingüe',
    descEs: 'Soporte completo en inglés y español',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
  },
] as const;

export function FeatureCards({ lang }: FeatureCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        const hasCustom = 'titleEs' in feature;
        const title = hasCustom
          ? (lang === 'en' ? feature.titleEn : (feature as any).titleEs)
          : feature.titleEn;
        const desc = hasCustom
          ? (lang === 'en' ? feature.descEn : (feature as any).descEs)
          : feature.descEn;

        return (
          <div
            key={index}
            className={`group flex flex-col items-center text-center p-4 rounded-xl bg-white border ${feature.border} hover:shadow-md hover:shadow-stone-100 transition-all duration-300 hover:-translate-y-0.5`}
          >
            <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`w-5 h-5 ${feature.color}`} />
            </div>
            <h3 className="text-sm font-semibold text-stone-800 mb-0.5">{title}</h3>
            <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
          </div>
        );
      })}
    </div>
  );
}
