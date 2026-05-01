'use client';

import React, { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { FileText, Loader2 } from 'lucide-react';

interface GeneratingViewProps {
  lang: Lang;
}

const STEPS = [
  { key: 'step1', icon: FileText },
  { key: 'step2', icon: FileText },
  { key: 'step3', icon: FileText },
];

export function GeneratingView({ lang }: GeneratingViewProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center space-y-6">
      <Loader2 className="w-12 h-12 text-amber-700 animate-spin mx-auto" />
      <div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">{t(lang, 'generating.title')}</h2>
        <p className="text-stone-500">{t(lang, 'generating.subtitle')}</p>
      </div>
      <div className="space-y-3 max-w-sm mx-auto">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                isActive ? 'bg-amber-50 border border-amber-200' : isDone ? 'bg-green-50 border border-green-200' : 'bg-stone-50 border border-stone-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isDone ? 'bg-green-500' : isActive ? 'bg-amber-500' : 'bg-stone-300'
              }`}>
                {isDone ? (
                  <span className="text-white text-xs">✓</span>
                ) : isActive ? (
                  <Icon className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-stone-500 text-xs">{i + 1}</span>
                )}
              </div>
              <span className={`text-sm ${isActive || isDone ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>
                {t(lang, `generating.${step.key}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
