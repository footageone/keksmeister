import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsentManager } from './core/consent-manager.js';
import { ScriptBlocker } from './core/script-blocker.js';
import { ServiceRegistry } from './core/service-adapter.js';
import { createPostHogAdapter } from './adapters/posthog.js';
import { createGoogleAnalyticsAdapter, createGoogleAdsAdapter } from './adapters/google-analytics.js';
import { createMetaPixelAdapter } from './adapters/meta-pixel.js';
import { createMatomoAdapter } from './adapters/matomo.js';

import type { KeksmeisterConfig } from './core/types.js';
import type { PostHogLike } from './adapters/posthog.js';

function clearCookies(): void {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

function createFullConfig(overrides: Partial<KeksmeisterConfig> = {}): KeksmeisterConfig {
  return {
    categories: [
      { id: 'essential', label: 'Essential', required: true },
      { id: 'functional', label: 'Functional' },
      {
        id: 'analytics',
        label: 'Analytics',
        services: [
          { id: 'ga', label: 'Google Analytics', cookies: ['_ga', '_gid'] },
          { id: 'posthog', label: 'PostHog' },
        ],
      },
      {
        id: 'marketing',
        label: 'Marketing',
        services: [
          { id: 'fbp', label: 'Meta Pixel', cookies: ['_fbp'] },
        ],
      },
    ],
    privacyUrl: '/datenschutz',
    lang: 'de',
    revision: '1',
    ...overrides,
  };
}

function createMockPostHog() {
  return {
    opt_in_capturing: vi.fn<PostHogLike['opt_in_capturing']>(),
    opt_out_capturing: vi.fn<PostHogLike['opt_out_capturing']>(),
    has_opted_in_capturing: vi.fn<PostHogLike['has_opted_in_capturing']>().mockReturnValue(false),
    has_opted_out_capturing: vi.fn<PostHogLike['has_opted_out_capturing']>().mockReturnValue(false),
  };
}

describe('Integration: Full consent flow', () => {
  beforeEach(() => {
    clearCookies();
    document.querySelectorAll('script[data-keksmeister]').forEach((el) => el.remove());
  });

  it('complete accept-all flow with adapters and script blocking', () => {
    // Setup: blocked scripts in the DOM
    const script = document.createElement('script');
    script.type = 'text/plain';
    script.setAttribute('data-keksmeister', 'analytics');
    script.textContent = 'console.log("analytics loaded")';
    document.body.appendChild(script);

    // Setup: mock services
    const posthog = createMockPostHog();
    const gtagMock = vi.fn();
    (globalThis as Record<string, unknown>).gtag = gtagMock;
    const fbqMock = vi.fn();
    (globalThis as Record<string, unknown>).fbq = fbqMock;

    const onConsent = vi.fn();
    const config = createFullConfig({ onConsent, googleConsentMode: true });

    // Initialize
    const manager = new ConsentManager(config);
    const blocker = new ScriptBlocker(manager);
    blocker.start();
    const registry = new ServiceRegistry(manager);

    registry.register(createPostHogAdapter(posthog));
    registry.register(createGoogleAnalyticsAdapter());
    registry.register(createGoogleAdsAdapter());
    registry.register(createMetaPixelAdapter());

    // Verify: nothing active before consent
    expect(manager.hasConsented).toBe(false);
    expect(manager.shouldShowBanner).toBe(true);
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
    expect(gtagMock).not.toHaveBeenCalled();
    expect(fbqMock).not.toHaveBeenCalled();

    // Action: accept all
    manager.acceptAll();

    // Verify: consent recorded
    expect(manager.hasConsented).toBe(true);
    expect(manager.shouldShowBanner).toBe(false);
    expect(onConsent).toHaveBeenCalledOnce();
    expect(onConsent.mock.calls[0][0].method).toBe('accept-all');

    // Verify: PostHog opted in
    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();

    // Verify: Google Consent Mode updated
    expect(gtagMock).toHaveBeenCalledWith('consent', 'update', expect.objectContaining({
      analytics_storage: 'granted',
      ad_storage: 'granted',
    }));

    // Verify: Meta Pixel granted
    expect(fbqMock).toHaveBeenCalledWith('consent', 'grant');

    // Verify: blocked script was activated (replaced with real script)
    const blocked = document.querySelector('script[data-keksmeister="analytics"]');
    expect(blocked).toBeNull(); // original should be gone

    // Cleanup
    blocker.stop();
    delete (globalThis as Record<string, unknown>).gtag;
    delete (globalThis as Record<string, unknown>).fbq;
  });

  it('complete reject-all flow', () => {
    const posthog = createMockPostHog();
    const fbqMock = vi.fn();
    (globalThis as Record<string, unknown>).fbq = fbqMock;

    const onConsent = vi.fn();
    const config = createFullConfig({ onConsent });
    const manager = new ConsentManager(config);
    const registry = new ServiceRegistry(manager);

    registry.register(createPostHogAdapter(posthog));
    registry.register(createMetaPixelAdapter());

    // Action: reject all
    manager.rejectAll();

    // Verify
    expect(manager.hasConsented).toBe(true);
    expect(manager.isAccepted('essential')).toBe(true);
    expect(manager.isAccepted('analytics')).toBe(false);
    expect(manager.isAccepted('marketing')).toBe(false);
    expect(onConsent.mock.calls[0][0].method).toBe('reject-all');

    // Adapters should be revoked
    expect(posthog.opt_out_capturing).toHaveBeenCalledOnce();
    expect(fbqMock).toHaveBeenCalledWith('consent', 'revoke');

    delete (globalThis as Record<string, unknown>).fbq;
  });

  it('custom consent: analytics yes, marketing no', () => {
    const posthog = createMockPostHog();
    const fbqMock = vi.fn();
    (globalThis as Record<string, unknown>).fbq = fbqMock;

    const config = createFullConfig();
    const manager = new ConsentManager(config);
    const registry = new ServiceRegistry(manager);

    registry.register(createPostHogAdapter(posthog));
    registry.register(createMetaPixelAdapter());

    manager.saveCustom({ analytics: true, marketing: false });

    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();
    expect(fbqMock).toHaveBeenCalledWith('consent', 'revoke');

    delete (globalThis as Record<string, unknown>).fbq;
  });

  it('consent persists across manager instances', () => {
    const config = createFullConfig();

    // First session: accept all
    const manager1 = new ConsentManager(config);
    manager1.acceptAll();

    // Second session: new manager reads from cookie
    const manager2 = new ConsentManager(config);
    expect(manager2.hasConsented).toBe(true);
    expect(manager2.isAccepted('analytics')).toBe(true);
    expect(manager2.isAccepted('marketing')).toBe(true);
    expect(manager2.shouldShowBanner).toBe(false);

    // Adapters should get synced on registration
    const posthog = createMockPostHog();
    const registry = new ServiceRegistry(manager2);
    registry.register(createPostHogAdapter(posthog));
    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();
  });

  it('revision change triggers re-consent', () => {
    const config1 = createFullConfig({ revision: '1' });
    const manager1 = new ConsentManager(config1);
    manager1.acceptAll();

    // New revision: banner should show again
    const config2 = createFullConfig({ revision: '2' });
    const manager2 = new ConsentManager(config2);
    expect(manager2.shouldShowBanner).toBe(true);
    expect(manager2.hasConsented).toBe(false);
    expect(manager2.isAccepted('analytics')).toBe(false);
  });

  it('revokeAll resets everything and triggers adapter revoke', () => {
    const posthog = createMockPostHog();
    const config = createFullConfig();
    const manager = new ConsentManager(config);
    const registry = new ServiceRegistry(manager);
    registry.register(createPostHogAdapter(posthog));

    manager.acceptAll();
    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();

    posthog.opt_in_capturing.mockClear();
    posthog.opt_out_capturing.mockClear();
    posthog.has_opted_out_capturing.mockReturnValue(false);

    manager.revokeAll();

    expect(manager.hasConsented).toBe(false);
    expect(manager.shouldShowBanner).toBe(true);
    expect(posthog.opt_out_capturing).toHaveBeenCalledOnce();
  });

  it('cookie auto-clear on category revocation', () => {
    document.cookie = '_ga=GA12345; path=/';
    document.cookie = '_fbp=FB12345; path=/';

    const config = createFullConfig();
    const manager = new ConsentManager(config);
    manager.acceptAll();

    expect(document.cookie).toContain('_ga=');
    expect(document.cookie).toContain('_fbp=');

    // Revoke marketing only
    manager.saveCustom({ essential: true, functional: true, analytics: true, marketing: false });

    expect(document.cookie).toContain('_ga='); // analytics still accepted
    expect(document.cookie).not.toContain('_fbp='); // marketing cookies cleared
  });

  it('Matomo adapter with tracking consent mode', () => {
    const paq: unknown[][] = [];
    const config = createFullConfig();
    const manager = new ConsentManager(config);
    const registry = new ServiceRegistry(manager);

    registry.register(createMatomoAdapter(paq, { mode: 'tracking' }));

    manager.acceptAll();
    expect(paq).toContainEqual(['setConsentGiven']);

    paq.length = 0;
    manager.saveCustom({ analytics: false, marketing: false });
    expect(paq).toContainEqual(['forgetConsentGiven']);
  });

  it('multiple adapters for same category all get notified', () => {
    const posthog = createMockPostHog();
    const fbqMock = vi.fn();
    (globalThis as Record<string, unknown>).fbq = fbqMock;

    const config = createFullConfig();
    const manager = new ConsentManager(config);
    const registry = new ServiceRegistry(manager);

    // PostHog in analytics, Meta Pixel in marketing
    registry.register(createPostHogAdapter(posthog));
    registry.register(createMetaPixelAdapter());

    manager.acceptAll();

    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();
    expect(fbqMock).toHaveBeenCalledWith('consent', 'grant');

    delete (globalThis as Record<string, unknown>).fbq;
  });
});
