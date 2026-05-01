import { translations, type Lang } from './translations';

/**
 * Get a translated string by key path.
 * @param lang - The language code ('en' or 'es')
 * @param key - Dot-notation key, e.g. 'header.title'
 * @returns The translated string, or the key itself if not found
 */
export function t(lang: Lang, key: string): string {
  const keys = key.split('.');
  let result: unknown = translations[lang];
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      return key; // Fallback to key if not found
    }
  }
  return typeof result === 'string' ? result : key;
}

export type { Lang };
