import type { ServiceAdapter } from '../core/service-adapter.js';
import { getGlobalFn, type BaseAdapterOptions } from './shared.js';

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

export interface GoogleAnalyticsAdapterOptions extends BaseAdapterOptions {}
export interface GoogleAdsAdapterOptions extends BaseAdapterOptions {}

export function createGoogleAnalyticsAdapter(
  options: GoogleAnalyticsAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'google-analytics',
    category: options.category ?? 'analytics',
    onConsent: () => {
      getGlobalFn<GtagFn>('gtag')?.('consent', 'update', {
        analytics_storage: 'granted',
      });
    },
    onRevoke: () => {
      getGlobalFn<GtagFn>('gtag')?.('consent', 'update', {
        analytics_storage: 'denied',
      });
    },
  };
}

export function createGoogleAdsAdapter(
  options: GoogleAdsAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'google-ads',
    category: options.category ?? 'marketing',
    onConsent: () => {
      getGlobalFn<GtagFn>('gtag')?.('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    },
    onRevoke: () => {
      getGlobalFn<GtagFn>('gtag')?.('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    },
  };
}
