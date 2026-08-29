import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CookieStore } from './cookie-store.js';
import type { ConsentRecord } from './types.js';
import { clearCookies } from '../test-utils.js';

/**
 * Locates the `cookie` accessor descriptor on `document`'s prototype chain.
 * happy-dom implements it on an internal `Document` class that isn't the
 * same object as the global `Document` identifier, so we walk the actual
 * chain instead of assuming `Document.prototype`.
 */
function findCookieDescriptor(): PropertyDescriptor {
  let proto: object | null = Object.getPrototypeOf(document);
  while (proto) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'cookie');
    if (descriptor) return descriptor;
    proto = Object.getPrototypeOf(proto);
  }
  throw new Error('Could not locate the document.cookie accessor');
}

/**
 * Spies on the `document.cookie` setter and returns every raw string passed
 * to it. happy-dom implements `cookie` as a prototype accessor, so we wrap
 * it rather than reassigning `document.cookie` directly.
 */
function spyOnCookieWrites(): { writes: string[]; restore: () => void } {
  const descriptor = findCookieDescriptor();
  const writes: string[] = [];
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: descriptor.get,
    set(value: string) {
      writes.push(value);
      descriptor.set!.call(document, value);
    },
  });
  return {
    writes,
    restore: () => {
      delete (document as unknown as Record<string, unknown>).cookie;
    },
  };
}

describe('CookieStore', () => {
  beforeEach(() => {
    clearCookies();
  });

  it('returns null when no consent cookie exists', () => {
    const store = new CookieStore();
    expect(store.read()).toBeNull();
  });

  it('writes and reads a consent record', () => {
    const store = new CookieStore();
    const record: ConsentRecord = {
      timestamp: '2026-03-24T10:00:00.000Z',
      revision: '1',
      choices: { essential: true, analytics: false, marketing: false },
      method: 'custom',
    };

    store.write(record);
    const read = store.read();

    expect(read).toEqual(record);
  });

  it('uses custom cookie name', () => {
    const store = new CookieStore({ cookieName: 'my_consent' });
    const record: ConsentRecord = {
      timestamp: '2026-03-24T10:00:00.000Z',
      revision: '1',
      choices: { essential: true },
      method: 'accept-all',
    };

    store.write(record);
    expect(document.cookie).toContain('my_consent=');
    expect(store.read()).toEqual(record);
  });

  it('clears the consent cookie', () => {
    const store = new CookieStore();
    store.write({
      timestamp: '2026-03-24T10:00:00.000Z',
      revision: '1',
      choices: { essential: true },
      method: 'accept-all',
    });

    expect(store.read()).not.toBeNull();
    store.clear();
    expect(store.read()).toBeNull();
  });

  it('returns empty choices when no cookie exists', () => {
    const store = new CookieStore();
    expect(store.getChoices()).toEqual({});
  });

  it('returns choices from stored record', () => {
    const store = new CookieStore();
    const choices = { essential: true, analytics: true, marketing: false };
    store.write({
      timestamp: '2026-03-24T10:00:00.000Z',
      revision: '1',
      choices,
      method: 'custom',
    });

    expect(store.getChoices()).toEqual(choices);
  });

  it('handles corrupted cookie data gracefully', () => {
    document.cookie = 'keksmeister_consent=not-valid-base64; path=/';
    const store = new CookieStore();
    expect(store.read()).toBeNull();
  });

  it('clears specific cookies by name', () => {
    document.cookie = '_ga=GA12345; path=/';
    document.cookie = '_fbp=fb12345; path=/';
    expect(document.cookie).toContain('_ga=');

    const store = new CookieStore();
    store.clearCookies(['_ga', '_fbp']);

    expect(document.cookie).not.toContain('_ga=');
    expect(document.cookie).not.toContain('_fbp=');
  });

  describe('domain-scoped cookie clearing', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('retries deletion across the hostname and its parent domains', () => {
      vi.stubGlobal('location', { hostname: 'app.www.example.com', protocol: 'http:' });
      const { writes, restore } = spyOnCookieWrites();

      const store = new CookieStore();
      store.clearCookies(['_ga']);

      // The plain, no-domain attempt is still made.
      expect(
        writes.some((w) => w.startsWith('_ga=') && !w.includes('domain='))
      ).toBe(true);
      // Plus one attempt per domain variant, from most to least specific.
      expect(
        writes.some((w) => w.startsWith('_ga=') && w.includes('domain=.app.www.example.com'))
      ).toBe(true);
      expect(
        writes.some((w) => w.startsWith('_ga=') && w.includes('domain=.www.example.com'))
      ).toBe(true);
      expect(
        writes.some((w) => w.startsWith('_ga=') && w.includes('domain=.example.com'))
      ).toBe(true);
      // Never strips down to the bare TLD-plus-one's parent (single label).
      expect(writes.some((w) => w.includes('domain=.com'))).toBe(false);

      restore();
    });

    it('only tries the bare hostname domain when it already has 2 labels', () => {
      vi.stubGlobal('location', { hostname: 'example.com', protocol: 'http:' });
      const { writes, restore } = spyOnCookieWrites();

      const store = new CookieStore();
      store.clearCookies(['_ga']);

      const domainWrites = writes.filter((w) => w.startsWith('_ga=') && w.includes('domain='));
      expect(domainWrites).toHaveLength(1);
      expect(domainWrites[0]).toContain('domain=.example.com');

      restore();
    });

    it('skips domain variants when no hostname is available (non-browser env)', () => {
      vi.stubGlobal('location', {});
      const { writes, restore } = spyOnCookieWrites();

      const store = new CookieStore();
      store.clearCookies(['_ga']);

      expect(writes.some((w) => w.includes('domain='))).toBe(false);

      restore();
    });

    it('still attempts the explicitly configured cookieDomain', () => {
      vi.stubGlobal('location', {});
      const { writes, restore } = spyOnCookieWrites();

      const store = new CookieStore({ cookieDomain: '.configured.example' });
      store.clearCookies(['_ga']);

      expect(
        writes.some((w) => w.startsWith('_ga=') && w.includes('domain=.configured.example'))
      ).toBe(true);

      restore();
    });
  });
});
