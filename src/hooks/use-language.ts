'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import type { Lang } from '@/lib/i18n';

export function useLanguage() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);

  const toggleLang = useCallback(() => {
    const next: Lang = lang === 'en' ? 'es' : 'en';
    setLang(next);
  }, [lang, setLang]);

  return { lang, toggleLang };
}
