import type { ServiceAdapter } from '../core/service-adapter.js';

/**
 * TikTok Pixel adapter.
 *
 * @see https://ads.tiktok.com/marketing_api/docs?id=1739584860883969
 *
 * Documented consent API methods (from TikTok docs):
 * - `ttq.grantConsent()` — enable tracking
 * - `ttq.revokeConsent()` — disable tracking
 * - `ttq.holdConsent()` — pause consent status
 *
 * TikTok Pixel uses a consent API similar to Meta Pixel:
 *
 * ```js
 * ttq.grantConsent();  // enable tracking
 * ttq.revokeConsent(); // disable tracking
 * ```
 *
 * Initialize TikTok Pixel with consent revoked:
 *
 * ```js
 * ttq.load('PIXEL_ID');
 * ttq.revokeConsent();
 * ```
 *
 * Then register the adapter:
 *
 * ```js
 * registry.register(createTikTokPixelAdapter());
 * ```
 */

type TtqFn = {
  grantConsent: () => void;
  revokeConsent: () => void;
};

function getTtq(): TtqFn | null {
  const w = globalThis as Record<string, unknown>;
  const ttq = w.ttq as TtqFn | undefined;
  if (ttq && typeof ttq.grantConsent === 'function') return ttq;
  return null;
}

export interface TikTokPixelAdapterOptions {
  /** Consent category (default: 'marketing') */
  category?: string;
  /** Service id (default: 'tiktok-pixel') */
  id?: string;
}

/**
 * Create a TikTok Pixel service adapter.
 */
export function createTikTokPixelAdapter(
  options: TikTokPixelAdapterOptions = {}
): ServiceAdapter {
  return {
    id: options.id ?? 'tiktok-pixel',
    category: options.category ?? 'marketing',
    onConsent: () => {
      getTtq()?.grantConsent();
    },
    onRevoke: () => {
      getTtq()?.revokeConsent();
    },
  };
}
