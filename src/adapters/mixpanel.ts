import type { ServiceAdapter } from '../core/service-adapter.js';

/**
 * Mixpanel adapter.
 *
 * Initialize Mixpanel with `opt_out_tracking_by_default: true`:
 *
 * ```js
 * mixpanel.init('YOUR_TOKEN', { opt_out_tracking_by_default: true });
 * ```
 *
 * Then register the adapter:
 *
 * ```js
 * registry.register(createMixpanelAdapter(mixpanel));
 * ```
 */

export interface MixpanelLike {
  opt_in_tracking: () => void;
  opt_out_tracking: () => void;
  has_opted_in_tracking: () => boolean;
  has_opted_out_tracking: () => boolean;
}

export interface MixpanelAdapterOptions {
  /** Consent category (default: 'analytics') */
  category?: string;
  /** Service id (default: 'mixpanel') */
  id?: string;
}

/**
 * Create a Mixpanel service adapter.
 */
export function createMixpanelAdapter(
  mixpanel: MixpanelLike,
  options: MixpanelAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'mixpanel',
    category: options.category ?? 'analytics',
    onConsent: () => {
      if (!mixpanel.has_opted_in_tracking()) {
        mixpanel.opt_in_tracking();
      }
    },
    onRevoke: () => {
      if (!mixpanel.has_opted_out_tracking()) {
        mixpanel.opt_out_tracking();
      }
    },
  };
}
