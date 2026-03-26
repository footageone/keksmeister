import type { KeksmeisterConfig } from './core/types.js';

/** Clear all cookies in the test environment. */
export function clearCookies(): void {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

/** Create a standard test config with optional overrides. */
export function createConfig(overrides: Partial<KeksmeisterConfig> = {}): KeksmeisterConfig {
  return {
    categories: [
      { id: 'essential', label: 'Essential', required: true },
      { id: 'analytics', label: 'Analytics' },
      { id: 'marketing', label: 'Marketing' },
    ],
    privacyUrl: '/privacy',
    ...overrides,
  };
}
