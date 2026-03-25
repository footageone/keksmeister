import type { ServiceAdapter } from '../core/service-adapter.js';

/**
 * HubSpot tracking adapter.
 *
 * @see https://developers.hubspot.com/docs/reference/api/cms/cookie-consent-banner#external-cookie-consent-banner-integration
 * @see https://developers.hubspot.com/docs/reference/api/cms/cookie-consent-banner
 *
 * Uses the HubSpot `_hsp` queue with `setHubSpotConsent` for granting/revoking consent.
 *
 * Disable HubSpot's own cookie banner first:
 *
 * ```js
 * window.disableHubSpotCookieBanner = true;
 * ```
 *
 * Then register the adapter:
 *
 * ```js
 * registry.register(createHubSpotAdapter());
 * ```
 */

type HspFn = Array<unknown[]>;

function getHsp(): HspFn {
  const w = globalThis as Record<string, unknown>;
  if (!w._hsp) w._hsp = [];
  return w._hsp as HspFn;
}

export interface HubSpotAdapterOptions {
  /** Consent category (default: 'marketing') */
  category?: string;
  /** Service id (default: 'hubspot') */
  id?: string;
  /** Grant HubSpot analytics consent (default: true) */
  analyticsConsent?: boolean;
  /** Grant HubSpot advertisement consent (default: true) */
  advertisementConsent?: boolean;
  /** Grant HubSpot functionality consent (default: true) */
  functionalityConsent?: boolean;
}

/**
 * Create a HubSpot service adapter.
 */
export function createHubSpotAdapter(
  options: HubSpotAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'hubspot',
    category: options.category ?? 'marketing',
    onConsent: () => {
      getHsp().push([
        'setHubSpotConsent',
        {
          analytics: options.analyticsConsent ?? true,
          advertisement: options.advertisementConsent ?? true,
          functionality: options.functionalityConsent ?? true,
        },
      ]);
    },
    onRevoke: () => {
      getHsp().push([
        'setHubSpotConsent',
        { analytics: false, advertisement: false, functionality: false },
      ]);
    },
  };
}
