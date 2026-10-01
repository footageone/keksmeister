import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CookieStore } from './cookie-store.js';
import type { ConsentRecord } from './types.js';
import { clearCookies } from '../test-utils.js';

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

  // A host-only cookie and a `domain=` cookie of the same name are two cookies, and the browser
  // lists both. happy-dom keys cookies by name and path only, so the two copies are stubbed.
  describe('when the consent cookie exists twice', () => {
    const staleRecord: ConsentRecord = {
      timestamp: '2026-03-24T10:00:00.000Z',
      revision: '1',
      choices: { essential: true, analytics: true },
      method: 'accept-all',
    };
    const currentRecord: ConsentRecord = {
      timestamp: '2026-09-24T10:00:00.000Z',
      revision: '2',
      choices: { essential: true, analytics: false },
      method: 'reject-all',
    };
    const asCookie = (record: ConsentRecord) =>
      `keksmeister_consent=${encodeURIComponent(btoa(JSON.stringify(record)))}`;

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('reads the most recent decision when the stale copy is listed first', () => {
      vi.spyOn(document, 'cookie', 'get').mockReturnValue(
        `${asCookie(staleRecord)}; other=1; ${asCookie(currentRecord)}`
      );

      expect(new CookieStore({ cookieDomain: '.example.com' }).read()).toEqual(currentRecord);
    });

    it('reads the most recent decision when the stale copy is listed last', () => {
      vi.spyOn(document, 'cookie', 'get').mockReturnValue(
        `${asCookie(currentRecord)}; ${asCookie(staleRecord)}`
      );

      expect(new CookieStore({ cookieDomain: '.example.com' }).read()).toEqual(currentRecord);
    });

    it('skips a corrupted copy and reads the valid one', () => {
      vi.spyOn(document, 'cookie', 'get').mockReturnValue(
        `keksmeister_consent=not-valid-base64; ${asCookie(currentRecord)}`
      );

      expect(new CookieStore().read()).toEqual(currentRecord);
    });
  });

  describe('host-only copy left behind by an earlier configuration', () => {
    const record: ConsentRecord = {
      timestamp: '2026-09-24T10:00:00.000Z',
      revision: '2',
      choices: { essential: true },
      method: 'accept-all',
    };
    const isExpiry = (cookie: string) => cookie.includes('expires=Thu, 01 Jan 1970');
    const hasDomain = (cookie: string) => /;\s*domain=/.test(cookie);

    function recordWrites(): string[] {
      const writes: string[] = [];
      vi.spyOn(document, 'cookie', 'set').mockImplementation((value) => {
        writes.push(value);
      });
      return writes;
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('expires the host-only copy when writing with a cookieDomain', () => {
      const writes = recordWrites();

      new CookieStore({ cookieDomain: '.example.com' }).write(record);

      expect(writes).toHaveLength(2);
      expect(writes.filter((w) => isExpiry(w) && !hasDomain(w))).toHaveLength(1);
      expect(writes.filter((w) => !isExpiry(w) && w.includes('domain=.example.com'))).toHaveLength(1);
    });

    it('expires both copies when clearing with a cookieDomain', () => {
      const writes = recordWrites();

      new CookieStore({ cookieDomain: '.example.com' }).clear();

      expect(writes).toHaveLength(2);
      expect(writes.every(isExpiry)).toBe(true);
      expect(writes.filter(hasDomain)).toHaveLength(1);
    });

    it('writes a single host-only cookie without a cookieDomain', () => {
      const writes = recordWrites();

      new CookieStore().write(record);

      expect(writes).toHaveLength(1);
      expect(isExpiry(writes[0])).toBe(false);
      expect(hasDomain(writes[0])).toBe(false);
    });
  });
});
