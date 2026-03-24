import type { KeksmeisterTranslations } from '../core/types.js';
import { de } from './de.js';
import { en } from './en.js';

const translations: Record<string, KeksmeisterTranslations> = { de, en };

/**
 * Resolve translations from a language code or custom translations object.
 * Falls back to German if the language is not found.
 */
export function resolveTranslations(
  lang: string | KeksmeisterTranslations | undefined
): KeksmeisterTranslations {
  if (!lang) return de;
  if (typeof lang === 'object') return lang;
  return translations[lang] ?? de;
}

export { de, en };
