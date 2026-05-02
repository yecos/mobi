'use client';

import React from 'react';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, CheckCircle2, Sparkles } from 'lucide-react';

interface AppHeaderProps {
  lang: Lang;
  onToggleLang: () => void;
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'success';
  showCatalogBadge?: boolean;
  catalogCount?: number;
  actions?: React.ReactNode;
  onToggleCopilot?: () => void;
  copilotOpen?: boolean;
}

export function AppHeader({
  lang,
  onToggleLang,
  title,
  subtitle,
  variant = 'default',
  showCatalogBadge,
  catalogCount,
  actions,
  onToggleCopilot,
  copilotOpen,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-stone-900">{t(lang, 'header.title')}</h1>
            {variant === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
          </div>
          {title && (
            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold text-stone-700">{title}</h2>
              {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}

          {/* Copilot Toggle Button */}
          {onToggleCopilot && (
            <Button
              variant={copilotOpen ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleCopilot}
              className={copilotOpen
                ? 'bg-amber-800 hover:bg-amber-900 text-white gap-1'
                : 'border-amber-300 text-amber-800 hover:bg-amber-50 gap-1'
              }
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">
                {lang === 'en' ? 'Copilot' : 'Copilot'}
              </span>
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={onToggleLang} className="text-stone-600">
            <Globe className="w-4 h-4 mr-1" />
            {t(lang, 'header.language')}
          </Button>
        </div>
      </div>
    </header>
  );
}
