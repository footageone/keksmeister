import type { ServiceAdapter } from '../core/service-adapter.js';

/**
 * Hotjar adapter.
 *
 * @see https://help.hotjar.com/hc/en-us/articles/115011789248-Hotjar-Compliance-with-GDPR
 * @see https://help.hotjar.com/hc/en-us/articles/360002735873-Using-Hotjar-with-a-Consent-Manager
 *
 * Uses Hotjar's consent API: `hj('consent', 'granted')` / `hj('consent', 'denied')`.
 *
 * ```js
 * registry.register(createHotjarAdapter());
 * ```
 */

type HjFn = (...args: unknown[]) => void;

function getHj(): HjFn | null {
  const w = globalThis as Record<string, unknown>;
  return typeof w.hj === 'function' ? (w.hj as HjFn) : null;
}

export interface HotjarAdapterOptions {
  /** Consent category (default: 'analytics') */
  category?: string;
  /** Service id (default: 'hotjar') */
  id?: string;
}

/**
 * Create a Hotjar service adapter.
 */
export function createHotjarAdapter(
  options: HotjarAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'hotjar',
    category: options.category ?? 'analytics',
    onConsent: () => {
      getHj()?.('consent', 'granted');
    },
    onRevoke: () => {
      getHj()?.('consent', 'denied');
    },
  };
}
