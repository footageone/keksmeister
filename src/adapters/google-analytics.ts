import type { ServiceAdapter } from '../core/service-adapter.js';

/**
 * Google Analytics 4 / Google Consent Mode v2 adapter.
 *
 * @see https://developers.google.com/tag-platform/security/guides/consent?consentmode=advanced
 * @see https://support.google.com/analytics/answer/9976101
 *
 * Documented consent API (from Google docs):
 * - `gtag('consent', 'default', { ... })` — set initial consent state
 * - `gtag('consent', 'update', { ... })` — update consent state
 * - Valid signals: `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`
 * - Valid values: `'granted'` | `'denied'`
 *
 * This adapter uses Google's Consent Mode API (`gtag('consent', 'update', ...)`)
 * instead of script blocking. GA4 continues to run but respects the consent
 * state — sending cookieless pings when denied, full tracking when granted.
 *
 * Setup: Add the default consent state BEFORE loading gtag.js:
 *
 * ```html
 * <script>
 *   window.dataLayer = window.dataLayer || [];
 *   function gtag(){dataLayer.push(arguments);}
 *   gtag('consent', 'default', {
 *     'analytics_storage': 'denied',
 *     'ad_storage': 'denied',
 *     'ad_user_data': 'denied',
 *     'ad_personalization': 'denied',
 *   });
 * </script>
 * ```
 *
 * Then register the adapter(s):
 *
 * ```js
 * registry.register(createGoogleAnalyticsAdapter());
 * registry.register(createGoogleAdsAdapter());
 * ```
 */

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  const w = globalThis as Record<string, unknown>;
  return typeof w.gtag === 'function' ? (w.gtag as GtagFn) : null;
}

export interface GoogleAnalyticsAdapterOptions {
  /** Consent category (default: 'analytics') */
  category?: string;
  /** Service id (default: 'google-analytics') */
  id?: string;
}

/**
 * Create a Google Analytics adapter (controls `analytics_storage`).
 */
export function createGoogleAnalyticsAdapter(
  options: GoogleAnalyticsAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'google-analytics',
    category: options.category ?? 'analytics',
    onConsent: () => {
      getGtag()?.('consent', 'update', {
        analytics_storage: 'granted',
      });
    },
    onRevoke: () => {
      getGtag()?.('consent', 'update', {
        analytics_storage: 'denied',
      });
    },
  };
}

export interface GoogleAdsAdapterOptions {
  /** Consent category (default: 'marketing') */
  category?: string;
  /** Service id (default: 'google-ads') */
  id?: string;
}

/**
 * Create a Google Ads adapter (controls `ad_storage`, `ad_user_data`, `ad_personalization`).
 */
export function createGoogleAdsAdapter(
  options: GoogleAdsAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'google-ads',
    category: options.category ?? 'marketing',
    onConsent: () => {
      getGtag()?.('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    },
    onRevoke: () => {
      getGtag()?.('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    },
  };
}
