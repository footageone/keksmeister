import type { ServiceAdapter } from '../core/service-adapter.js';

/**
 * Matomo/Piwik analytics adapter.
 *
 * @see https://developer.matomo.org/guides/tracking-consent
 *
 * Matomo should be initialized with `requireConsent` or `requireCookieConsent`:
 *
 * ```js
 * _paq.push(['requireConsent']);  // blocks all tracking
 * // or
 * _paq.push(['requireCookieConsent']);  // allows cookieless tracking
 * ```
 *
 * Then register the adapter:
 *
 * ```js
 * registry.register(createMatomoAdapter());
 * ```
 */

/** The Matomo _paq command queue. */
export type MatomoPaq = Array<unknown[]>;

export interface MatomoAdapterOptions {
  /** Consent category (default: 'analytics') */
  category?: string;
  /** Service id (default: 'matomo') */
  id?: string;
  /**
   * Consent mode:
   * - 'tracking' — blocks all requests until consent (requireConsent)
   * - 'cookie' — allows cookieless requests, blocks cookies (requireCookieConsent)
   * Default: 'tracking'
   */
  mode?: 'tracking' | 'cookie';
  /**
   * If true, Matomo stores consent in its own cookie via
   * rememberConsentGiven / rememberCookieConsentGiven.
   * Default: false (Keksmeister manages persistence)
   */
  rememberInMatomo?: boolean;
}

/**
 * Create a Matomo service adapter.
 *
 * @param paq - The Matomo _paq array (default: window._paq)
 * @param options - Optional configuration
 */
export function createMatomoAdapter(
  paq?: MatomoPaq,
  options: MatomoAdapterOptions = {}
): ServiceAdapter {
  const getPaq = (): MatomoPaq => {
    if (paq) return paq;
    const w = globalThis as Record<string, unknown>;
    if (!w._paq) w._paq = [];
    return w._paq as MatomoPaq;
  };

  const mode = options.mode ?? 'tracking';
  const remember = options.rememberInMatomo ?? false;

  return {
    id: options.id ?? 'matomo',
    category: options.category ?? 'analytics',
    onConsent: () => {
      const q = getPaq();
      if (mode === 'cookie') {
        q.push(remember ? ['rememberCookieConsentGiven'] : ['setCookieConsentGiven']);
      } else {
        q.push(remember ? ['rememberConsentGiven'] : ['setConsentGiven']);
      }
    },
    onRevoke: () => {
      const q = getPaq();
      if (mode === 'cookie') {
        q.push(['forgetCookieConsentGiven']);
      } else {
        q.push(['forgetConsentGiven']);
      }
    },
  };
}
