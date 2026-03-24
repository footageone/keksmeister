import { CookieStore } from './cookie-store.js';
import type {
  ConsentCategory,
  ConsentChoices,
  ConsentRecord,
  KeksmeisterConfig,
} from './types.js';

/**
 * Core consent state manager.
 *
 * Framework-agnostic — manages consent state, cookie persistence,
 * and script blocking. Does not render any UI.
 *
 * Usage:
 *   const manager = new ConsentManager(config);
 *   manager.acceptAll();
 *   manager.isAccepted('analytics'); // true
 */
export class ConsentManager extends EventTarget {
  private config: KeksmeisterConfig;
  private store: CookieStore;
  private choices: ConsentChoices = {};
  private _hasConsented = false;

  constructor(config: KeksmeisterConfig) {
    super();
    this.config = config;
    this.store = new CookieStore({
      cookieName: config.cookieName,
      cookieLifetimeDays: config.cookieLifetimeDays,
      cookieDomain: config.cookieDomain,
    });
    this.restore();
  }

  /** Whether the user has made any consent choice (accept, reject, or custom). */
  get hasConsented(): boolean {
    return this._hasConsented;
  }

  /** Whether the stored consent matches the current config revision. */
  get isConsentCurrent(): boolean {
    const record = this.store.read();
    if (!record) return false;
    return record.revision === this.getRevision();
  }

  /** Returns true if the banner should be shown (no consent, outdated revision, or expired). */
  get shouldShowBanner(): boolean {
    if (!this._hasConsented || !this.isConsentCurrent) return true;
    if (this.isConsentExpired) return true;
    return false;
  }

  /** Whether the consent has exceeded the configured consentMaxAgeDays. */
  get isConsentExpired(): boolean {
    const maxAgeDays = this.config.consentMaxAgeDays;
    if (!maxAgeDays) return false;

    const record = this.store.read();
    if (!record) return false;

    const consentDate = new Date(record.timestamp).getTime();
    const maxAgeMs = maxAgeDays * 864e5;
    return Date.now() - consentDate > maxAgeMs;
  }

  /** Check if a specific category is accepted. Required categories always return true. */
  isAccepted(categoryId: string): boolean {
    const category = this.config.categories.find((c) => c.id === categoryId);
    if (category?.required) return true;
    return this.choices[categoryId] === true;
  }

  /** Get a snapshot of all current choices. */
  getChoices(): ConsentChoices {
    return { ...this.choices };
  }

  /** Accept all categories. */
  acceptAll(): void {
    const choices: ConsentChoices = {};
    for (const cat of this.config.categories) {
      choices[cat.id] = true;
    }
    this.applyChoices(choices, 'accept-all');
  }

  /** Reject all non-required categories. */
  rejectAll(): void {
    const choices: ConsentChoices = {};
    for (const cat of this.config.categories) {
      choices[cat.id] = cat.required === true;
    }
    this.applyChoices(choices, 'reject-all');
  }

  /** Apply custom category choices from the settings modal. */
  saveCustom(choices: ConsentChoices): void {
    // Ensure required categories cannot be declined
    const sanitized: ConsentChoices = {};
    for (const cat of this.config.categories) {
      sanitized[cat.id] = cat.required ? true : (choices[cat.id] ?? false);
    }
    this.applyChoices(sanitized, 'custom');
  }

  /** Programmatically revoke consent and clear the cookie. */
  revokeAll(): void {
    this.choices = {};
    this._hasConsented = false;
    this.store.clear();
    this.dispatch('keksmeister:revoke', { categoryId: '*' });
  }

  /** Get all configured categories. */
  getCategories(): ConsentCategory[] {
    return this.config.categories;
  }

  /** Update the config (e.g. after language change). */
  updateConfig(config: Partial<KeksmeisterConfig>): void {
    Object.assign(this.config, config);
  }

  // --- Private ---

  private restore(): void {
    const record = this.store.read();
    if (record && record.revision === this.getRevision()) {
      this.choices = record.choices;
      this._hasConsented = true;
    }
  }

  private applyChoices(
    choices: ConsentChoices,
    method: ConsentRecord['method']
  ): void {
    const previousChoices = { ...this.choices };
    this.choices = choices;
    this._hasConsented = true;

    const record: ConsentRecord = {
      timestamp: new Date().toISOString(),
      revision: this.getRevision(),
      choices,
      method,
    };

    this.store.write(record);

    // Auto-clear cookies for newly declined categories
    if (this.config.autoClearCookies !== false) {
      this.autoClear(previousChoices, choices);
    }

    // Fire callback
    this.config.onConsent?.(record);

    // Dispatch DOM event
    this.dispatch('keksmeister:consent', record);

    // Update Google Consent Mode if enabled
    if (this.config.googleConsentMode) {
      this.updateGoogleConsentMode(choices);
    }

    // Push to GTM dataLayer if available
    this.pushToDataLayer(record);
  }

  private autoClear(
    previous: ConsentChoices,
    current: ConsentChoices
  ): void {
    for (const cat of this.config.categories) {
      if (previous[cat.id] && !current[cat.id] && cat.services) {
        const cookieNames = cat.services.flatMap((s) => s.cookies ?? []);
        if (cookieNames.length > 0) {
          this.store.clearCookies(cookieNames);
        }
      }
    }
  }

  private updateGoogleConsentMode(choices: ConsentChoices): void {
    const gtag = (globalThis as Record<string, unknown>)['gtag'] as
      | ((...args: unknown[]) => void)
      | undefined;
    if (typeof gtag !== 'function') return;

    gtag('consent', 'update', {
      analytics_storage: choices['analytics'] ? 'granted' : 'denied',
      ad_storage: choices['marketing'] ? 'granted' : 'denied',
      ad_user_data: choices['marketing'] ? 'granted' : 'denied',
      ad_personalization: choices['marketing'] ? 'granted' : 'denied',
      functionality_storage: choices['functional'] ? 'granted' : 'denied',
    });
  }

  private pushToDataLayer(record: ConsentRecord): void {
    const w = globalThis as Record<string, unknown>;
    if (!Array.isArray(w.dataLayer)) return;

    (w.dataLayer as unknown[]).push({
      event: 'keksmeister_consent',
      keksmeister: {
        method: record.method,
        revision: record.revision,
        ...record.choices,
      },
    });
  }

  private getRevision(): string {
    return this.config.revision ?? '1';
  }

  private dispatch(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }
}
