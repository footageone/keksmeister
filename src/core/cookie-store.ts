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
    // Third-party scripts (e.g. GA4's `_ga`) commonly scope their cookies to
    // a `domain=` attribute (`.example.com`). Deleting without a matching
    // domain silently no-ops, so retry across the current hostname and its
    // parent domains in addition to the plain, path-only attempt.
    const domainVariants = this.hostnameDomainVariants();

    for (const name of names) {
      this.setCookie(name, '', -1);
      // Also try clearing with common path variations
      this.setCookie(name, '', -1, '/');
      for (const domain of domainVariants) {
        this.setCookie(name, '', -1, '/', domain);
      }
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
    path = '/',
    domain?: string
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

    // An explicit override (e.g. a domain variant tried during cookie
    // clearing) takes precedence over the configured domain.
    const effectiveDomain = domain ?? this.domain;
    if (effectiveDomain) {
      parts.push(`domain=${effectiveDomain}`);
    }

    // Set Secure flag when on HTTPS
    if (globalThis.location?.protocol === 'https:') {
      parts.push('Secure');
    }

    document.cookie = parts.join('; ');
  }

  /**
   * Candidate `domain=` values for cookie deletion: the current hostname
   * (with a leading dot) plus each parent domain down to 2 labels, e.g.
   * `app.www.example.com` -> `.app.www.example.com`, `.www.example.com`,
   * `.example.com`. Returns an empty list outside a browser (no
   * `location`).
   */
  private hostnameDomainVariants(): string[] {
    const hostname = globalThis.location?.hostname;
    if (!hostname) return [];

    const labels = hostname.split('.');
    const variants = [`.${hostname}`];
    for (let i = 1; i < labels.length - 1; i++) {
      variants.push(`.${labels.slice(i).join('.')}`);
    }
    return variants;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
