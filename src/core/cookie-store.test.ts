import { describe, it, expect, beforeEach } from 'vitest';
import { CookieStore } from './cookie-store.js';
import type { ConsentRecord } from './types.js';

describe('CookieStore', () => {
  beforeEach(() => {
    // Clear all cookies
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
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
});
