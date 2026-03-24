import type { KeksmeisterTranslations } from '../core/types.js';
import { de } from './de.js';
import { en } from './en.js';

// Only de and en are bundled in the main entry.
// Additional languages can be imported directly:
//   import { fr } from 'keksmeister/i18n/fr'
const builtinTranslations: Record<string, KeksmeisterTranslations> = { de, en };

// Additional translations loaded via registerTranslation()
const customTranslations: Record<string, KeksmeisterTranslations> = {};

/**
 * Register additional translations at runtime.
 *
 * ```ts
 * import { registerTranslation } from 'keksmeister';
 * import { fr } from 'keksmeister/i18n/fr';
 * registerTranslation('fr', fr);
 * ```
 */
export function registerTranslation(
  lang: string,
  translations: KeksmeisterTranslations
): void {
  customTranslations[lang] = translations;
}

/**
 * Resolve translations from a language code or custom translations object.
 * Falls back to German if the language is not found.
 */
export function resolveTranslations(
  lang: string | KeksmeisterTranslations | undefined
): KeksmeisterTranslations {
  if (!lang) return de;
  if (typeof lang === 'object') return lang;
  return customTranslations[lang] ?? builtinTranslations[lang] ?? de;
}

export { de, en };
