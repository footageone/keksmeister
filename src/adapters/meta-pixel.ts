import type { ServiceAdapter } from '../core/service-adapter.js';
import { getGlobalFn, type BaseAdapterOptions } from './shared.js';

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

export interface MetaPixelAdapterOptions extends BaseAdapterOptions {}

export function createMetaPixelAdapter(
  options: MetaPixelAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'meta-pixel',
    category: options.category ?? 'marketing',
    onConsent: () => {
      getGlobalFn<FbqFn>('fbq')?.('consent', 'grant');
    },
    onRevoke: () => {
      getGlobalFn<FbqFn>('fbq')?.('consent', 'revoke');
    },
  };
}
