'use client';

import React from 'react';
import { t, type Lang } from '@/lib/i18n';
import { Upload, Brain, PenTool, FileDown } from 'lucide-react';

interface HowItWorksProps {
  lang: Lang;
}

const steps = [
  {
    icon: Upload,
    titleEn: 'Upload Photo',
    titleEs: 'Sube una Foto',
    descEn: 'Drag & drop or click to upload any furniture image. JPG, PNG, WebP supported.',
    descEs: 'Arrastra o haz clic para subir cualquier imagen de mobiliario. JPG, PNG, WebP compatibles.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    icon: Brain,
    titleEn: 'AI Analysis',
    titleEs: 'Análisis IA',
    descEn: 'Our AI identifies the furniture type, materials, dimensions, and finishes automatically.',
    descEs: 'Nuestra IA identifica el tipo de mobiliario, materiales, dimensiones y acabados automáticamente.',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    icon: PenTool,
    titleEn: 'Review & Edit',
    titleEs: 'Revisa y Edita',
    descEn: 'Fine-tune the extracted specifications. Adjust dimensions, materials, and brand details.',
    descEs: 'Ajusta las especificaciones extraídas. Modifica dimensiones, materiales y detalles de marca.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    icon: FileDown,
    titleEn: 'Generate PDFs',
    titleEs: 'Genera PDFs',
    descEn: 'Download professional spec sheets with technical drawings in metric and imperial units.',
    descEs: 'Descarga fichas profesionales con planimetrías técnicas en unidades métricas e imperiales.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
];

export function HowItWorks({ lang }: HowItWorksProps) {
  return (
    <section className="py-16 sm:py-20 bg-white/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-3">
            {lang === 'en' ? 'How It Works' : 'Cómo Funciona'}
          </h2>
          <p className="text-stone-500 max-w-lg mx-auto">
            {lang === 'en'
              ? 'From photo to professional spec sheet in four simple steps.'
              : 'De foto a ficha profesional en cuatro simples pasos.'}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const title = lang === 'en' ? step.titleEn : step.titleEs;
            const desc = lang === 'en' ? step.descEn : step.descEs;

            return (
              <div key={index} className="relative">
                {/* Connector line (desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-stone-200" />
                )}

                <div className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-stone-200 hover:border-stone-300 transition-all duration-300 hover:shadow-sm">
                  {/* Step number */}
                  <div className="absolute -top-3 left-4 w-6 h-6 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl ${step.bgColor} border ${step.borderColor} flex items-center justify-center mb-4`}>
                    <Icon className={`w-7 h-7 ${step.color}`} />
                  </div>

                  <h3 className="font-bold text-stone-900 mb-2">{title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
