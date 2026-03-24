import type { ServiceAdapter } from '../core/service-adapter.js';

/**
 * HubSpot tracking adapter.
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
        { analytics: true, advertisement: true, functionality: true },
      ]);
    },
    onRevoke: () => {
      getHsp().push(['revokeCookieConsent']);
    },
  };
}
