import type { ServiceAdapter } from '../core/service-adapter.js';

/**
 * Plausible Analytics adapter.
 *
 * @see https://plausible.io/docs/excluding#exclude-yourself-from-the-analytics
 *
 * Plausible is privacy-focused and doesn't use cookies, so consent is
 * technically not required. However, some site owners want to respect
 * a user's explicit opt-out preference.
 *
 * Plausible checks `localStorage.plausible_ignore` — if set to "true",
 * it skips all tracking and logs "Ignoring Event: localStorage flag"
 * to the console.
 *
 * ```js
 * registry.register(createPlausibleAdapter());
 * ```
 */

export interface PlausibleAdapterOptions {
  /** Consent category (default: 'analytics') */
  category?: string;
  /** Service id (default: 'plausible') */
  id?: string;
  /** localStorage key (default: 'plausible_ignore') */
  storageKey?: string;
}

/**
 * Create a Plausible Analytics service adapter.
 */
export function createPlausibleAdapter(
  options: PlausibleAdapterOptions = {}
): ServiceAdapter {
  const key = options.storageKey ?? 'plausible_ignore';

  return {
    id: options.id ?? 'plausible',
    category: options.category ?? 'analytics',
    onConsent: () => {
      try {
        localStorage.removeItem(key);
      } catch {
        // localStorage might not be available
      }
    },
    onRevoke: () => {
      try {
        localStorage.setItem(key, 'true');
      } catch {
        // localStorage might not be available
      }
    },
  };
}
