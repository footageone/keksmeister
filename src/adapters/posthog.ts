import type { ServiceAdapter } from '../core/service-adapter.js';

/**
 * PostHog analytics adapter.
 *
 * Integrates PostHog's opt-in/opt-out mechanism with Keksmeister.
 *
 * PostHog should be initialized with `opt_out_capturing_by_default: true`
 * so no data is captured before consent:
 *
 * ```js
 * posthog.init('phc_...', {
 *   api_host: 'https://eu.i.posthog.com',
 *   opt_out_capturing_by_default: true,
 * });
 * ```
 *
 * Then register the adapter:
 *
 * ```js
 * import { ServiceRegistry } from 'keksmeister';
 * import { createPostHogAdapter } from 'keksmeister/adapters/posthog';
 *
 * registry.register(createPostHogAdapter(posthog));
 * ```
 */

/** Minimal PostHog instance interface (only what we need). */
export interface PostHogLike {
  opt_in_capturing: (options?: { enable_persistence?: boolean }) => void;
  opt_out_capturing: () => void;
  has_opted_in_capturing: () => boolean;
  has_opted_out_capturing: () => boolean;
}

export interface PostHogAdapterOptions {
  /** Consent category (default: 'analytics') */
  category?: string;
  /** Service id (default: 'posthog') */
  id?: string;
}

/**
 * Create a PostHog service adapter.
 *
 * @param posthog - The PostHog instance (window.posthog or imported)
 * @param options - Optional category and id overrides
 */
export function createPostHogAdapter(
  posthog: PostHogLike,
  options: PostHogAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'posthog',
    category: options.category ?? 'analytics',
    onConsent: () => {
      if (!posthog.has_opted_in_capturing()) {
        posthog.opt_in_capturing();
      }
    },
    onRevoke: () => {
      if (!posthog.has_opted_out_capturing()) {
        posthog.opt_out_capturing();
      }
    },
  };
}
