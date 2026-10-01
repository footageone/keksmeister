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

    if (options.cookieDomain && /[;\s=]/.test(options.cookieDomain)) {
      throw new Error(`[keksmeister] Invalid cookieDomain: "${options.cookieDomain}"`);
    }
    this.domain = options.cookieDomain;
  }

  /**
   * Read the stored consent record, or null if none exists.
   *
   * The consent cookie can exist more than once: a host-only cookie and a
   * `domain=` cookie of the same name are separate cookies, and
   * `document.cookie` lists both in an engine-specific order. That is the
   * state a returning visitor is in after `cookieDomain` was introduced or
   * changed. The most recent decision wins, so a stale copy cannot shadow
   * the answer the visitor just gave.
   */
  read(): ConsentRecord | null {
    const records = this.getCookies(this.name)
      .map((raw) => this.decode(raw))
      .filter((record): record is ConsentRecord => record !== null);

    if (records.length === 0) return null;

    return records.reduce((newest, record) =>
      this.decidedAt(record) > this.decidedAt(newest) ? record : newest
    );
  }

  /** Write a consent record to the cookie. */
  write(record: ConsentRecord): void {
    const encoded = btoa(JSON.stringify(record));
    this.expireHostOnlyCopy();
    this.setCookie(this.name, encoded, this.lifetimeDays);
  }

  /** Remove the consent cookie. */
  clear(): void {
    this.setCookie(this.name, '', -1);
    this.expireHostOnlyCopy();
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

  /**
   * With a `cookieDomain`, a host-only consent cookie written before the
   * domain was configured stays in the jar: it is a different cookie, so
   * neither writing nor clearing the domain cookie touches it. Expire it
   * explicitly, otherwise it outlives a revocation and keeps being sent.
   */
  private expireHostOnlyCopy(): void {
    if (this.domain) {
      this.setCookie(this.name, '', -1, '/', null);
    }
  }

  private decode(raw: string): ConsentRecord | null {
    try {
      return JSON.parse(atob(raw)) as ConsentRecord;
    } catch {
      return null;
    }
  }

  /** Sort key for duplicate records; an unparseable timestamp ranks oldest. */
  private decidedAt(record: ConsentRecord): number {
    const time = new Date(record.timestamp).getTime();
    return Number.isFinite(time) ? time : -Infinity;
  }

  /** Every value stored under `name`, in `document.cookie` order. */
  private getCookies(name: string): string[] {
    const pattern = new RegExp(`(?:^|;\\s*)${this.escapeRegex(name)}=([^;]*)`, 'g');
    return Array.from(document.cookie.matchAll(pattern), (match) => {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return '';
      }
    }).filter((value) => value !== '');
  }

  /** `domain: null` writes a host-only cookie regardless of the configured domain. */
  private setCookie(
    name: string,
    value: string,
    days: number,
    path = '/',
    domain: string | null = this.domain ?? null
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

    if (domain) {
      parts.push(`domain=${domain}`);
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
