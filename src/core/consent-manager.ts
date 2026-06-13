import { ConsentLogger } from './consent-logger.js';
import { CookieStore } from './cookie-store.js';
import type {
  ConsentCategory,
  ConsentChoices,
  ConsentConfigSnapshot,
  ConsentRecord,
  KeksmeisterConfig,
  KeksmeisterTranslations,
} from './types.js';

/**
 * Decouple snapshot data from its source. structuredClone is the standard
 * deep clone; the JSON fallback covers older runtimes (and the test sandbox).
 */
function deepClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Default re-prompt window. Picked to match the CNIL six-month guidance,
 * which most EU DPAs accept as a defensible upper bound for how long a
 * consent decision should stand without being re-asked. Operators can
 * override via `KeksmeisterConfig.consentMaxAgeDays`, including disabling
 * the re-prompt by setting it to `0`.
 */
const DEFAULT_CONSENT_MAX_AGE_DAYS = 180;

/**
 * Generate a pseudonymous UUIDv4. Prefers crypto.randomUUID, then a
 * crypto.getRandomValues-based v4, and only falls back to Math.random in
 * environments without Web Crypto (rare, non-secure contexts).
 */
function generateId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();

  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
    return (
      hex.slice(0, 4).join('') +
      '-' + hex.slice(4, 6).join('') +
      '-' + hex.slice(6, 8).join('') +
      '-' + hex.slice(8, 10).join('') +
      '-' + hex.slice(10, 16).join('')
    );
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
  private subjectId: string | undefined;
  private logger: ConsentLogger | undefined;

  constructor(config: KeksmeisterConfig) {
    super();
    this.config = config;
    this.store = new CookieStore({
      cookieName: config.cookieName,
      cookieLifetimeDays: config.cookieLifetimeDays,
      cookieDomain: config.cookieDomain,
    });
    if (config.logging) {
      this.logger = new ConsentLogger(config.logging);
    }
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

  /**
   * Whether the stored consent has exceeded the re-prompt window.
   * Uses `consentMaxAgeDays` when configured; otherwise falls back to
   * {@link DEFAULT_CONSENT_MAX_AGE_DAYS} (CNIL six-month guidance). Set
   * `consentMaxAgeDays: 0` to disable the re-prompt entirely.
   *
   * Invariants:
   * - Only an exact `0` disables expiry. Negative numbers and any
   *   non-finite value (NaN, ±Infinity) fall back to the default — a
   *   misconfigured `NaN` from a runtime cast must not silently turn off
   *   re-prompting.
   * - A stored timestamp that cannot be parsed is treated as expired so
   *   a corrupted cookie can't suppress the banner.
   */
  get isConsentExpired(): boolean {
    const configured = this.config.consentMaxAgeDays;
    const maxAgeDays =
      configured === 0
        ? 0
        : typeof configured === 'number' && Number.isFinite(configured) && configured > 0
          ? configured
          : DEFAULT_CONSENT_MAX_AGE_DAYS;
    if (maxAgeDays === 0) return false;

    const record = this.store.read();
    if (!record) return false;

    const consentDate = new Date(record.timestamp).getTime();
    if (!Number.isFinite(consentDate)) return true;
    const maxAgeMs = maxAgeDays * 864e5;
    return Date.now() - consentDate > maxAgeMs;
  }

  /** Whether this instance uses opt-out mode (CCPA). */
  get isOptOut(): boolean {
    return this.config.mode === 'opt-out';
  }

  /**
   * Check if a specific category is accepted.
   * - Required categories always return true.
   * - In opt-out mode, categories default to true until explicitly declined.
   * - In opt-in mode (default), categories default to false until explicitly accepted.
   */
  isAccepted(categoryId: string): boolean {
    const category = this.config.categories.find((c) => c.id === categoryId);
    if (category?.required) return true;
    if (this.choices[categoryId] !== undefined) return this.choices[categoryId];
    // No explicit choice yet — default depends on mode
    return this.isOptOut;
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
    const choices: ConsentChoices = {};
    for (const cat of this.config.categories) {
      choices[cat.id] = cat.required === true;
    }

    const record: ConsentRecord = {
      timestamp: new Date().toISOString(),
      revision: this.getRevision(),
      choices,
      method: 'revoke',
      action: 'revoke',
      subjectId: this.subjectId ?? generateId(),
    };

    // Log the withdrawal as part of the audit trail before clearing state.
    this.logger?.log(record);

    this.choices = {};
    this._hasConsented = false;
    this.subjectId = undefined;
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

  /**
   * Build a snapshot of the banner configuration as currently shown to the
   * visitor — categories, privacy URL, and (optionally) resolved translations.
   * Pass the resolved translations explicitly when `config.lang` is a language
   * code, so the snapshot captures the actual on-screen texts.
   *
   * The returned object is decoupled from the live config: callers that
   * mutate `this.config.categories` or the resolved translations after the
   * fact cannot retroactively change a snapshot that was already taken.
   */
  getConfigSnapshot(opts?: {
    translations?: KeksmeisterTranslations;
  }): ConsentConfigSnapshot {
    const langValue = this.config.lang;
    const snapshot: ConsentConfigSnapshot = {
      revision: this.getRevision(),
      capturedAt: new Date().toISOString(),
      categories: deepClone(this.config.categories),
      privacyUrl: this.config.privacyUrl,
    };
    if (this.config.imprintUrl !== undefined) {
      snapshot.imprintUrl = this.config.imprintUrl;
    }
    if (typeof langValue === 'string') snapshot.lang = langValue;
    const resolved =
      opts?.translations ?? (typeof langValue === 'object' ? langValue : undefined);
    if (resolved) snapshot.translations = deepClone(resolved);
    return snapshot;
  }

  /**
   * Upload a banner-config snapshot via the configured logger. Idempotent per
   * revision via the logger's localStorage flag. No-op when no logger is
   * configured.
   */
  sendConfigSnapshot(snapshot?: ConsentConfigSnapshot): void {
    if (!this.logger) return;
    this.logger.logSnapshot(snapshot ?? this.getConfigSnapshot());
  }

  // --- Private ---

  private restore(): void {
    const record = this.store.read();
    if (!record) return;
    // Recover the pseudonymous id even across a revision bump, so re-consent on
    // the same browser stays tied to the same subject in the audit trail.
    this.subjectId = record.subjectId;
    if (record.revision === this.getRevision()) {
      this.choices = record.choices;
      this._hasConsented = true;
    }
  }

  private applyChoices(
    choices: ConsentChoices,
    method: ConsentRecord['method']
  ): void {
    const previousChoices = { ...this.choices };
    const action: ConsentRecord['action'] = this._hasConsented ? 'update' : 'grant';
    this.choices = choices;
    this._hasConsented = true;
    this.subjectId ??= generateId();

    const record: ConsentRecord = {
      timestamp: new Date().toISOString(),
      revision: this.getRevision(),
      choices,
      method,
      action,
      subjectId: this.subjectId,
    };

    this.store.write(record);

    // Auto-clear cookies for newly declined categories
    if (this.config.autoClearCookies !== false) {
      this.autoClear(previousChoices, choices);
    }

    // Fire callback
    this.config.onConsent?.(record);

    // Server-side logging (grant/update)
    this.logger?.log(record);

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
      if (previous[cat.id] !== false && !current[cat.id] && cat.services) {
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

    const m = this.config.googleConsentModeMapping;
    const analyticsCategory = m?.analytics_storage ?? 'analytics';
    const marketingCategory = m?.ad_storage ?? 'marketing';
    const adUserDataCategory = m?.ad_user_data ?? marketingCategory;
    const adPersonalizationCategory = m?.ad_personalization ?? marketingCategory;
    const functionalCategory = m?.functionality_storage ?? 'functional';

    gtag('consent', 'update', {
      analytics_storage: choices[analyticsCategory] ? 'granted' : 'denied',
      ad_storage: choices[marketingCategory] ? 'granted' : 'denied',
      ad_user_data: choices[adUserDataCategory] ? 'granted' : 'denied',
      ad_personalization: choices[adPersonalizationCategory] ? 'granted' : 'denied',
      functionality_storage: choices[functionalCategory] ? 'granted' : 'denied',
    });
  }

  private pushToDataLayer(record: ConsentRecord): void {
    const w = globalThis as Record<string, unknown>;
    if (!Array.isArray(w.dataLayer)) return;

    (w.dataLayer as unknown[]).push({
      event: 'keksmeister_consent',
      keksmeister: {
        method: record.method,
        action: record.action,
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
