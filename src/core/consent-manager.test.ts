import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsentManager } from './consent-manager.js';
import type { KeksmeisterConfig, ConsentRecord } from './types.js';

function createConfig(overrides: Partial<KeksmeisterConfig> = {}): KeksmeisterConfig {
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

function clearCookies(): void {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

describe('ConsentManager', () => {
  beforeEach(() => {
    clearCookies();
  });

  describe('initial state', () => {
    it('has no consent initially', () => {
      const manager = new ConsentManager(createConfig());
      expect(manager.hasConsented).toBe(false);
    });

    it('should show banner when no consent given', () => {
      const manager = new ConsentManager(createConfig());
      expect(manager.shouldShowBanner).toBe(true);
    });

    it('required categories are always accepted', () => {
      const manager = new ConsentManager(createConfig());
      expect(manager.isAccepted('essential')).toBe(true);
    });

    it('optional categories are not accepted initially', () => {
      const manager = new ConsentManager(createConfig());
      expect(manager.isAccepted('analytics')).toBe(false);
      expect(manager.isAccepted('marketing')).toBe(false);
    });
  });

  describe('acceptAll', () => {
    it('accepts all categories', () => {
      const manager = new ConsentManager(createConfig());
      manager.acceptAll();

      expect(manager.isAccepted('essential')).toBe(true);
      expect(manager.isAccepted('analytics')).toBe(true);
      expect(manager.isAccepted('marketing')).toBe(true);
      expect(manager.hasConsented).toBe(true);
    });

    it('fires onConsent callback with accept-all method', () => {
      const onConsent = vi.fn();
      const manager = new ConsentManager(createConfig({ onConsent }));
      manager.acceptAll();

      expect(onConsent).toHaveBeenCalledOnce();
      const record: ConsentRecord = onConsent.mock.calls[0][0];
      expect(record.method).toBe('accept-all');
      expect(record.choices).toEqual({
        essential: true,
        analytics: true,
        marketing: true,
      });
      expect(record.timestamp).toBeDefined();
      expect(record.revision).toBe('1');
    });

    it('dispatches keksmeister:consent event', () => {
      const manager = new ConsentManager(createConfig());
      const handler = vi.fn();
      manager.addEventListener('keksmeister:consent', handler);

      manager.acceptAll();
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('rejectAll', () => {
    it('rejects all optional categories', () => {
      const manager = new ConsentManager(createConfig());
      manager.rejectAll();

      expect(manager.isAccepted('essential')).toBe(true);
      expect(manager.isAccepted('analytics')).toBe(false);
      expect(manager.isAccepted('marketing')).toBe(false);
      expect(manager.hasConsented).toBe(true);
    });

    it('fires onConsent callback with reject-all method', () => {
      const onConsent = vi.fn();
      const manager = new ConsentManager(createConfig({ onConsent }));
      manager.rejectAll();

      const record: ConsentRecord = onConsent.mock.calls[0][0];
      expect(record.method).toBe('reject-all');
      expect(record.choices.analytics).toBe(false);
      expect(record.choices.marketing).toBe(false);
      expect(record.choices.essential).toBe(true);
    });
  });

  describe('saveCustom', () => {
    it('saves custom choices', () => {
      const manager = new ConsentManager(createConfig());
      manager.saveCustom({ essential: true, analytics: true, marketing: false });

      expect(manager.isAccepted('analytics')).toBe(true);
      expect(manager.isAccepted('marketing')).toBe(false);
    });

    it('enforces required categories cannot be declined', () => {
      const manager = new ConsentManager(createConfig());
      manager.saveCustom({ essential: false, analytics: true, marketing: false });

      expect(manager.isAccepted('essential')).toBe(true);
    });

    it('fires onConsent callback with custom method', () => {
      const onConsent = vi.fn();
      const manager = new ConsentManager(createConfig({ onConsent }));
      manager.saveCustom({ analytics: true, marketing: false });

      const record: ConsentRecord = onConsent.mock.calls[0][0];
      expect(record.method).toBe('custom');
    });
  });

  describe('persistence', () => {
    it('restores consent from cookie', () => {
      const config = createConfig();
      const manager1 = new ConsentManager(config);
      manager1.acceptAll();

      // New manager reads from cookie
      const manager2 = new ConsentManager(config);
      expect(manager2.hasConsented).toBe(true);
      expect(manager2.isAccepted('analytics')).toBe(true);
      expect(manager2.shouldShowBanner).toBe(false);
    });

    it('shows banner when revision changes', () => {
      const manager1 = new ConsentManager(createConfig({ revision: '1' }));
      manager1.acceptAll();

      const manager2 = new ConsentManager(createConfig({ revision: '2' }));
      expect(manager2.shouldShowBanner).toBe(true);
      expect(manager2.hasConsented).toBe(false);
    });
  });

  describe('revokeAll', () => {
    it('clears consent state and cookie', () => {
      const manager = new ConsentManager(createConfig());
      manager.acceptAll();
      expect(manager.hasConsented).toBe(true);

      manager.revokeAll();
      expect(manager.hasConsented).toBe(false);
      expect(manager.isAccepted('analytics')).toBe(false);
    });

    it('dispatches keksmeister:revoke event', () => {
      const manager = new ConsentManager(createConfig());
      manager.acceptAll();

      const handler = vi.fn();
      manager.addEventListener('keksmeister:revoke', handler);
      manager.revokeAll();

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('getChoices', () => {
    it('returns a snapshot of current choices', () => {
      const manager = new ConsentManager(createConfig());
      manager.acceptAll();

      const choices = manager.getChoices();
      expect(choices).toEqual({
        essential: true,
        analytics: true,
        marketing: true,
      });

      // Should be a copy, not a reference
      choices.analytics = false;
      expect(manager.isAccepted('analytics')).toBe(true);
    });
  });

  describe('getCategories', () => {
    it('returns the configured categories', () => {
      const config = createConfig();
      const manager = new ConsentManager(config);
      expect(manager.getCategories()).toEqual(config.categories);
    });
  });

  describe('auto-clear cookies', () => {
    it('clears cookies when category is revoked', () => {
      const config = createConfig({
        categories: [
          { id: 'essential', label: 'Essential', required: true },
          {
            id: 'analytics',
            label: 'Analytics',
            services: [
              { id: 'ga', label: 'Google Analytics', cookies: ['_ga', '_gid'] },
            ],
          },
        ],
      });

      // Set some cookies that GA would set
      document.cookie = '_ga=GA12345; path=/';
      document.cookie = '_gid=GID12345; path=/';

      const manager = new ConsentManager(config);
      manager.acceptAll();
      expect(document.cookie).toContain('_ga=');

      // Now reject analytics
      manager.saveCustom({ analytics: false });
      expect(document.cookie).not.toContain('_ga=');
      expect(document.cookie).not.toContain('_gid=');
    });

    it('does not clear cookies when autoClearCookies is false', () => {
      const config = createConfig({
        autoClearCookies: false,
        categories: [
          { id: 'essential', label: 'Essential', required: true },
          {
            id: 'analytics',
            label: 'Analytics',
            services: [
              { id: 'ga', label: 'Google Analytics', cookies: ['_ga'] },
            ],
          },
        ],
      });

      document.cookie = '_ga=GA12345; path=/';

      const manager = new ConsentManager(config);
      manager.acceptAll();
      manager.saveCustom({ analytics: false });

      expect(document.cookie).toContain('_ga=');
    });
  });

  describe('Google Consent Mode', () => {
    it('calls gtag consent update when enabled', () => {
      const gtagMock = vi.fn();
      (globalThis as Record<string, unknown>).gtag = gtagMock;

      const manager = new ConsentManager(
        createConfig({
          googleConsentMode: true,
          categories: [
            { id: 'essential', label: 'Essential', required: true },
            { id: 'functional', label: 'Functional' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'marketing', label: 'Marketing' },
          ],
        })
      );
      manager.acceptAll();

      expect(gtagMock).toHaveBeenCalledWith('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        functionality_storage: 'granted',
      });

      delete (globalThis as Record<string, unknown>).gtag;
    });
  });

  describe('GTM dataLayer', () => {
    it('pushes consent event to dataLayer when present', () => {
      const dataLayer: unknown[] = [];
      (globalThis as Record<string, unknown>).dataLayer = dataLayer;

      const manager = new ConsentManager(createConfig());
      manager.acceptAll();

      expect(dataLayer).toHaveLength(1);
      const pushed = dataLayer[0] as Record<string, unknown>;
      expect(pushed.event).toBe('keksmeister_consent');
      expect(pushed.keksmeister).toEqual(expect.objectContaining({
        method: 'accept-all',
        analytics: true,
        marketing: true,
      }));

      delete (globalThis as Record<string, unknown>).dataLayer;
    });

    it('does not push if dataLayer is not present', () => {
      // Should not throw
      const manager = new ConsentManager(createConfig());
      manager.acceptAll();
    });
  });

  describe('consent expiry', () => {
    it('shows banner when consent exceeds maxAgeDays', () => {
      const config = createConfig({ consentMaxAgeDays: 180 });
      const manager1 = new ConsentManager(config);
      manager1.acceptAll();

      // Manipulate the stored timestamp to be 181 days old
      const store = manager1['store'];
      const record = store.read()!;
      record.timestamp = new Date(Date.now() - 181 * 864e5).toISOString();
      store.write(record);

      const manager2 = new ConsentManager(config);
      expect(manager2.isConsentExpired).toBe(true);
      expect(manager2.shouldShowBanner).toBe(true);
    });

    it('does not expire when maxAgeDays is not set', () => {
      const config = createConfig();
      const manager1 = new ConsentManager(config);
      manager1.acceptAll();

      const manager2 = new ConsentManager(config);
      expect(manager2.isConsentExpired).toBe(false);
      expect(manager2.shouldShowBanner).toBe(false);
    });

    it('does not expire when consent is still fresh', () => {
      const config = createConfig({ consentMaxAgeDays: 180 });
      const manager1 = new ConsentManager(config);
      manager1.acceptAll();

      const manager2 = new ConsentManager(config);
      expect(manager2.isConsentExpired).toBe(false);
      expect(manager2.shouldShowBanner).toBe(false);
    });
  });

  describe('opt-out mode', () => {
    it('categories default to accepted in opt-out mode', () => {
      const manager = new ConsentManager(createConfig({ mode: 'opt-out' }));
      expect(manager.isOptOut).toBe(true);
      // No consent given yet, but in opt-out mode categories default to true
      expect(manager.isAccepted('analytics')).toBe(true);
      expect(manager.isAccepted('marketing')).toBe(true);
    });

    it('categories default to rejected in opt-in mode', () => {
      const manager = new ConsentManager(createConfig({ mode: 'opt-in' }));
      expect(manager.isOptOut).toBe(false);
      expect(manager.isAccepted('analytics')).toBe(false);
      expect(manager.isAccepted('marketing')).toBe(false);
    });

    it('defaults to opt-in when mode is not set', () => {
      const manager = new ConsentManager(createConfig());
      expect(manager.isOptOut).toBe(false);
      expect(manager.isAccepted('analytics')).toBe(false);
    });

    it('explicit choices override opt-out defaults', () => {
      const manager = new ConsentManager(createConfig({ mode: 'opt-out' }));
      manager.saveCustom({ analytics: false, marketing: true });

      expect(manager.isAccepted('analytics')).toBe(false);
      expect(manager.isAccepted('marketing')).toBe(true);
    });

    it('required categories are always accepted regardless of mode', () => {
      const manager = new ConsentManager(createConfig({ mode: 'opt-out' }));
      expect(manager.isAccepted('essential')).toBe(true);

      manager.rejectAll();
      expect(manager.isAccepted('essential')).toBe(true);
    });
  });
});
