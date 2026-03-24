import { describe, it, expect, beforeEach } from 'vitest';
import { ConsentManager } from './consent-manager.js';
import { ScriptBlocker } from './script-blocker.js';
import type { KeksmeisterConfig } from './types.js';

function createConfig(): KeksmeisterConfig {
  return {
    categories: [
      { id: 'essential', label: 'Essential', required: true },
      { id: 'analytics', label: 'Analytics' },
    ],
    privacyUrl: '/privacy',
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

describe('ScriptBlocker', () => {
  beforeEach(() => {
    clearCookies();
    // Clean up any test scripts
    document.querySelectorAll('script[data-keksmeister]').forEach((el) => el.remove());
    document.querySelectorAll('script[data-test-activated]').forEach((el) => el.remove());
  });

  it('does not activate scripts without consent', () => {
    const script = document.createElement('script');
    script.type = 'text/plain';
    script.setAttribute('data-keksmeister', 'analytics');
    script.textContent = 'window.__keksmeisterTestActivated = true';
    document.body.appendChild(script);

    const manager = new ConsentManager(createConfig());
    const blocker = new ScriptBlocker(manager);
    blocker.start();

    // Script should still be type="text/plain"
    const found = document.querySelector('script[data-keksmeister="analytics"]');
    expect(found).not.toBeNull();
    expect(found?.getAttribute('type')).toBe('text/plain');

    blocker.stop();
    script.remove();
  });

  it('activates scripts after consent', async () => {
    const script = document.createElement('script');
    script.type = 'text/plain';
    script.setAttribute('data-keksmeister', 'analytics');
    script.setAttribute('data-test-activated', 'true');
    // Use data-src to test the src rewriting
    script.setAttribute('data-src', 'https://example.com/test.js');
    document.body.appendChild(script);

    const manager = new ConsentManager(createConfig());
    const blocker = new ScriptBlocker(manager);
    blocker.start();

    manager.acceptAll();

    // The blocked script should be replaced with a real one
    // The new script should have src instead of data-src
    const activated = document.querySelector('script[src="https://example.com/test.js"]');
    expect(activated).not.toBeNull();
    expect(activated?.getAttribute('type')).toBeNull();
    expect(activated?.hasAttribute('data-keksmeister')).toBe(false);

    blocker.stop();
    activated?.remove();
  });

  it('stops observing after stop()', () => {
    const manager = new ConsentManager(createConfig());
    const blocker = new ScriptBlocker(manager);
    blocker.start();
    blocker.stop();

    // Adding a script after stop should not trigger activation
    const script = document.createElement('script');
    script.type = 'text/plain';
    script.setAttribute('data-keksmeister', 'analytics');
    document.body.appendChild(script);

    manager.acceptAll();

    // The original script should still be there (not replaced),
    // because the observer was stopped
    const found = document.querySelector('script[data-keksmeister="analytics"]');
    expect(found).not.toBeNull();

    script.remove();
  });
});
