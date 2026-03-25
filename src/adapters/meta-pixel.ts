import type { ServiceAdapter } from '../core/service-adapter.js';

/**
 * Meta (Facebook) Pixel adapter.
 *
 * @see https://developers.facebook.com/docs/meta-pixel/implementation/gdpr
 *
 * Documented consent API values (from Meta docs):
 * - Grant:  `fbq('consent', 'grant')`
 * - Revoke: `fbq('consent', 'revoke')`
 *
 * The Meta Pixel should be initialized with consent revoked:
 *
 * ```js
 * fbq('consent', 'revoke');
 * fbq('init', '123456789');
 * ```
 *
 * Then register the adapter:
 *
 * ```js
 * registry.register(createMetaPixelAdapter());
 * ```
 */

type FbqFn = (...args: unknown[]) => void;

function getFbq(): FbqFn | null {
  const w = globalThis as Record<string, unknown>;
  return typeof w.fbq === 'function' ? (w.fbq as FbqFn) : null;
}

export interface MetaPixelAdapterOptions {
  /** Consent category (default: 'marketing') */
  category?: string;
  /** Service id (default: 'meta-pixel') */
  id?: string;
}

/**
 * Create a Meta Pixel service adapter.
 */
export function createMetaPixelAdapter(
  options: MetaPixelAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'meta-pixel',
    category: options.category ?? 'marketing',
    onConsent: () => {
      getFbq()?.('consent', 'grant');
    },
    onRevoke: () => {
      getFbq()?.('consent', 'revoke');
    },
  };
}
