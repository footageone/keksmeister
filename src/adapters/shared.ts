/**
 * Shared utilities for service adapters.
 */

/** Base options shared by all adapter factory functions. */
export interface BaseAdapterOptions {
  /** Consent category this adapter belongs to */
  category?: string;
  /** Unique service identifier */
  id?: string;
}

/**
 * Get a global function by name, returning null if it doesn't exist.
 * Used by adapters that call a global SDK function (gtag, fbq, etc.).
 */
export function getGlobalFn<T extends (...args: never[]) => unknown>(
  key: string,
): T | null {
  const w = globalThis as Record<string, unknown>;
  return typeof w[key] === 'function' ? (w[key] as T) : null;
}
