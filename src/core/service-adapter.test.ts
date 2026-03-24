import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsentManager } from './consent-manager.js';
import { ServiceRegistry } from './service-adapter.js';
import type { ServiceAdapter } from './service-adapter.js';
import type { KeksmeisterConfig } from './types.js';

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

function createMockAdapter(id: string, category: string) {
  return {
    id,
    category,
    onConsent: vi.fn<ServiceAdapter['onConsent']>(),
    onRevoke: vi.fn<ServiceAdapter['onRevoke']>(),
  };
}

describe('ServiceRegistry', () => {
  beforeEach(() => {
    clearCookies();
  });

  it('calls onRevoke on register when no consent given', () => {
    const manager = new ConsentManager(createConfig());
    const registry = new ServiceRegistry(manager);
    const adapter = createMockAdapter('test', 'analytics');

    registry.register(adapter);

    // No consent yet, and hasConsented is false, so neither should be called
    expect(adapter.onConsent).not.toHaveBeenCalled();
    expect(adapter.onRevoke).not.toHaveBeenCalled();
  });

  it('calls onConsent on register when category is already accepted', () => {
    const manager = new ConsentManager(createConfig());
    manager.acceptAll();

    const registry = new ServiceRegistry(manager);
    const adapter = createMockAdapter('test', 'analytics');

    registry.register(adapter);
    expect(adapter.onConsent).toHaveBeenCalledOnce();
  });

  it('calls onRevoke on register when user rejected and category is not accepted', () => {
    const manager = new ConsentManager(createConfig());
    manager.rejectAll();

    const registry = new ServiceRegistry(manager);
    const adapter = createMockAdapter('test', 'analytics');

    registry.register(adapter);
    expect(adapter.onRevoke).toHaveBeenCalledOnce();
  });

  it('syncs all adapters when consent changes', () => {
    const manager = new ConsentManager(createConfig());
    const registry = new ServiceRegistry(manager);
    const analyticsAdapter = createMockAdapter('analytics-tool', 'analytics');
    const marketingAdapter = createMockAdapter('marketing-tool', 'marketing');

    registry.register(analyticsAdapter);
    registry.register(marketingAdapter);

    manager.acceptAll();

    expect(analyticsAdapter.onConsent).toHaveBeenCalledOnce();
    expect(marketingAdapter.onConsent).toHaveBeenCalledOnce();
  });

  it('calls onRevoke when consent is revoked for a category', () => {
    const manager = new ConsentManager(createConfig());
    const registry = new ServiceRegistry(manager);
    const adapter = createMockAdapter('test', 'analytics');

    registry.register(adapter);
    manager.acceptAll();
    expect(adapter.onConsent).toHaveBeenCalledOnce();

    // Now reject analytics
    manager.saveCustom({ analytics: false, marketing: true });
    expect(adapter.onRevoke).toHaveBeenCalledOnce();
  });

  it('calls onRevoke on all adapters when revokeAll is called', () => {
    const manager = new ConsentManager(createConfig());
    const registry = new ServiceRegistry(manager);
    const adapter1 = createMockAdapter('a', 'analytics');
    const adapter2 = createMockAdapter('b', 'marketing');

    registry.register(adapter1);
    registry.register(adapter2);

    manager.acceptAll();
    adapter1.onRevoke.mockClear();
    adapter2.onRevoke.mockClear();

    manager.revokeAll();
    expect(adapter1.onRevoke).toHaveBeenCalled();
    expect(adapter2.onRevoke).toHaveBeenCalled();
  });

  it('unregisters adapters by id', () => {
    const manager = new ConsentManager(createConfig());
    const registry = new ServiceRegistry(manager);
    const adapter = createMockAdapter('test', 'analytics');

    registry.register(adapter);
    registry.unregister('test');

    expect(registry.getAdapters()).toHaveLength(0);

    manager.acceptAll();
    // Should not be called after unregister
    expect(adapter.onConsent).not.toHaveBeenCalled();
  });

  it('handles required categories correctly', () => {
    const manager = new ConsentManager(createConfig());
    const registry = new ServiceRegistry(manager);
    const adapter = createMockAdapter('essential-tool', 'essential');

    registry.register(adapter);

    // Essential is always accepted, so onConsent should be called
    expect(adapter.onConsent).toHaveBeenCalledOnce();
  });
});
