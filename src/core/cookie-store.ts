import type { ConsentChoices, ConsentRecord } from './types.js';

const DEFAULT_COOKIE_NAME = 'keksmeister_consent';
const DEFAULT_LIFETIME_DAYS = 365;

export interface CookieStoreOptions {
  cookieName?: string;
  cookieLifetimeDays?: number;
  cookieDomain?: string;
}

/**
 * Reads and writes the consent cookie.
 *
 * The cookie value is a base64-encoded JSON object containing
 * the consent choices, revision, and timestamp.
 */
export class CookieStore {
  private name: string;
  private lifetimeDays: number;
  private domain: string | undefined;

  constructor(options: CookieStoreOptions = {}) {
    this.name = options.cookieName ?? DEFAULT_COOKIE_NAME;
    this.lifetimeDays = options.cookieLifetimeDays ?? DEFAULT_LIFETIME_DAYS;
    this.domain = options.cookieDomain;
  }

  /** Read the stored consent record, or null if none exists. */
  read(): ConsentRecord | null {
    const raw = this.getCookie(this.name);
    if (!raw) return null;

    try {
      const decoded = atob(raw);
      return JSON.parse(decoded) as ConsentRecord;
    } catch {
      return null;
    }
  }

  /** Write a consent record to the cookie. */
  write(record: ConsentRecord): void {
    const encoded = btoa(JSON.stringify(record));
    this.setCookie(this.name, encoded, this.lifetimeDays);
  }

  /** Remove the consent cookie. */
  clear(): void {
    this.setCookie(this.name, '', -1);
  }

  /** Delete specific cookies by name (used for auto-clear on revocation). */
  clearCookies(names: string[]): void {
    for (const name of names) {
      this.setCookie(name, '', -1);
      // Also try clearing with common path variations
      this.setCookie(name, '', -1, '/');
    }
  }

  /** Get the current consent choices, or an empty object if none stored. */
  getChoices(): ConsentChoices {
    return this.read()?.choices ?? {};
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${this.escapeRegex(name)}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  private setCookie(
    name: string,
    value: string,
    days: number,
    path = '/'
  ): void {
    const parts = [
      `${name}=${encodeURIComponent(value)}`,
      `path=${path}`,
      `SameSite=Lax`,
    ];

    if (days > 0) {
      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      parts.push(`expires=${expires}`);
    } else {
      parts.push('expires=Thu, 01 Jan 1970 00:00:00 GMT');
    }

    if (this.domain) {
      parts.push(`domain=${this.domain}`);
    }

    // Set Secure flag when on HTTPS
    if (globalThis.location?.protocol === 'https:') {
      parts.push('Secure');
    }

    document.cookie = parts.join('; ');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
