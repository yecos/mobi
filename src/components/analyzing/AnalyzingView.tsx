'use client';

import React from 'react';
import { Sparkles, CheckCircle2, Loader2, ImageIcon } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';

interface AnalyzingViewProps {
  imagePreview: string | null;
  messages: string[];
  lang: Lang;
}

export function AnalyzingView({ imagePreview, messages, lang }: AnalyzingViewProps) {
  const progress = Math.min((messages.length / 6) * 100, 95);

  return (
    <Card className="border-stone-200 shadow-xl">
      <CardContent className="p-8 sm:p-10">
        <div className="flex flex-col items-center gap-6">
          {/* Image preview */}
          {imagePreview && (
            <div className="w-full max-w-xs relative">
              <div className="absolute inset-0 bg-amber-500/10 rounded-lg animate-pulse" />
              <img
                src={imagePreview}
                alt="Analyzing furniture"
                className="w-full h-48 object-contain rounded-lg bg-stone-50 p-2 relative z-10"
              />
              <div className="absolute bottom-2 right-2 z-20 bg-stone-900/80 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {lang === 'en' ? 'Analyzing...' : 'Analizando...'}
              </div>
            </div>
          )}

          {/* Spinner */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-amber-100 border-t-amber-700 animate-spin" />
            <Sparkles className="w-7 h-7 text-amber-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>

          {/* Title */}
          <div className="text-center">
            <h3 className="text-xl sm:text-2xl font-bold text-stone-900 mb-2">
              {t(lang, 'analyzing.title')}
            </h3>
            <p className="text-sm text-stone-500">{t(lang, 'analyzing.subtitle')}</p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-xs text-stone-400 mb-2">
              <span>{lang === 'en' ? 'Progress' : 'Progreso'}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Messages list */}
          <div className="w-full max-w-sm space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-stone-700">{msg}</span>
              </div>
            ))}
            {messages.length < 6 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                </div>
                <span className="text-stone-400">{t(lang, 'analyzing.processing')}</span>
              </div>
            )}
          </div>

          {/* Estimated time */}
          <p className="text-xs text-stone-400">
            {lang === 'en'
              ? 'Usually completes in 10-30 seconds'
              : 'Usualmente completa en 10-30 segundos'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
