'use client';

import React from 'react';
import { t, type Lang } from '@/lib/i18n';
import { Sofa, ArrowDown, Zap, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  lang: Lang;
  onScrollToUpload: () => void;
}

export function HeroSection({ lang, onScrollToUpload }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-stone-200/40 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 mb-8 animate-fade-in-up">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {t(lang, 'header.aiPowered')}
            </span>
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            <span className="text-xs text-amber-600">v2.0</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mb-6 leading-tight">
            {t(lang, 'upload.generateProfessional')}
            <br />
            <span className="text-amber-800 relative">
              {t(lang, 'upload.furnitureSpecs')}
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 8C50 4 100 2 150 4C200 6 250 8 298 6" stroke="#d97706" strokeWidth="3" strokeLinecap="round" className="animate-pulse" />
              </svg>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t(lang, 'upload.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              size="lg"
              onClick={onScrollToUpload}
              className="h-14 px-8 text-lg bg-amber-800 hover:bg-amber-900 text-white rounded-xl shadow-lg shadow-amber-200 transition-all hover:scale-105 active:scale-95"
            >
              <Sofa className="w-5 h-5 mr-2" />
              {t(lang, 'upload.analyzeFurniture')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onScrollToUpload}
              className="h-14 px-8 text-lg rounded-xl border-stone-300 hover:bg-stone-50"
            >
              <ArrowDown className="w-5 h-5 mr-2" />
              {lang === 'en' ? 'See How It Works' : 'Ver Cómo Funciona'}
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-8 text-sm text-stone-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>{lang === 'en' ? 'Private & Secure' : 'Privado y Seguro'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>{lang === 'en' ? 'Metric + Imperial' : 'Métrico + Imperial'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>{lang === 'en' ? 'AI-Powered' : 'Impulsado por IA'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
