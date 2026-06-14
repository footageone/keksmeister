import { describe, it, expect, beforeEach } from 'vitest';
import { ConsentManager } from './consent-manager.js';
import { ScriptBlocker } from './script-blocker.js';
import { clearCookies, createConfig } from '../test-utils.js';

describe('ScriptBlocker', () => {
  beforeEach(() => {
    clearCookies();
    document
      .querySelectorAll('[data-keksmeister], [data-test-activated]')
      .forEach((el) => el.remove());
    // The flipped attributes survive across tests until removed.
    document
      .querySelectorAll(
        'img[data-test-activated], iframe[data-test-activated], link[data-test-activated]'
      )
      .forEach((el) => el.remove());
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

  it('does not load a tagged <img> pixel before consent', () => {
    const img = document.createElement('img');
    img.setAttribute('data-keksmeister', 'marketing');
    img.setAttribute('data-src', 'https://example.com/pixel.gif');
    img.setAttribute('data-test-activated', 'true');
    document.body.appendChild(img);

    const manager = new ConsentManager(createConfig());
    const blocker = new ScriptBlocker(manager);
    blocker.start();

    expect(img.hasAttribute('src')).toBe(false);
    expect(img.hasAttribute('data-src')).toBe(true);
    expect(img.hasAttribute('data-keksmeister')).toBe(true);

    blocker.stop();
    img.remove();
  });

  it('flips an <img> pixel data-src → src on consent', () => {
    const img = document.createElement('img');
    img.setAttribute('data-keksmeister', 'marketing');
    img.setAttribute('data-src', 'https://example.com/pixel.gif');
    img.setAttribute('data-test-activated', 'true');
    document.body.appendChild(img);

    const manager = new ConsentManager(createConfig());
    const blocker = new ScriptBlocker(manager);
    blocker.start();

    manager.acceptAll();

    expect(img.getAttribute('src')).toBe('https://example.com/pixel.gif');
    expect(img.hasAttribute('data-src')).toBe(false);
    expect(img.hasAttribute('data-keksmeister')).toBe(false);

    blocker.stop();
    img.remove();
  });

  it('flips an <iframe> data-src → src on consent', () => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('data-keksmeister', 'marketing');
    iframe.setAttribute('data-src', 'https://example.com/widget');
    iframe.setAttribute('data-test-activated', 'true');
    document.body.appendChild(iframe);

    const manager = new ConsentManager(createConfig());
    const blocker = new ScriptBlocker(manager);
    blocker.start();

    manager.acceptAll();

    expect(iframe.getAttribute('src')).toBe('https://example.com/widget');
    expect(iframe.hasAttribute('data-keksmeister')).toBe(false);

    blocker.stop();
    iframe.remove();
  });

  it('flips a <link> data-href → href on consent', () => {
    const link = document.createElement('link');
    link.setAttribute('data-keksmeister', 'analytics');
    link.setAttribute('rel', 'preload');
    link.setAttribute('as', 'style');
    link.setAttribute('data-href', 'https://example.com/asset.css');
    link.setAttribute('data-test-activated', 'true');
    document.head.appendChild(link);

    const manager = new ConsentManager(createConfig());
    const blocker = new ScriptBlocker(manager);
    blocker.start();

    manager.acceptAll();

    expect(link.getAttribute('href')).toBe('https://example.com/asset.css');
    expect(link.hasAttribute('data-href')).toBe(false);
    expect(link.hasAttribute('data-keksmeister')).toBe(false);

    blocker.stop();
    link.remove();
  });

  it('respects per-category consent: <img> in marketing stays blocked after analytics-only consent', () => {
    const img = document.createElement('img');
    img.setAttribute('data-keksmeister', 'marketing');
    img.setAttribute('data-src', 'https://example.com/pixel.gif');
    img.setAttribute('data-test-activated', 'true');
    document.body.appendChild(img);

    const manager = new ConsentManager(createConfig());
    const blocker = new ScriptBlocker(manager);
    blocker.start();

    manager.saveCustom({ analytics: true, marketing: false });

    expect(img.hasAttribute('src')).toBe(false);
    expect(img.hasAttribute('data-src')).toBe(true);

    blocker.stop();
    img.remove();
  });

  it('picks up a dynamically added pixel via MutationObserver', async () => {
    const manager = new ConsentManager(createConfig());
    const blocker = new ScriptBlocker(manager);
    blocker.start();
    manager.acceptAll();

    const img = document.createElement('img');
    img.setAttribute('data-keksmeister', 'marketing');
    img.setAttribute('data-src', 'https://example.com/dynamic.gif');
    document.body.appendChild(img);

    // MutationObserver fires asynchronously.
    await new Promise((r) => setTimeout(r, 0));

    expect(img.getAttribute('src')).toBe('https://example.com/dynamic.gif');

    blocker.stop();
    img.remove();
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
