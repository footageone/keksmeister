/**
 * Consent category definition.
 *
 * Each category groups one or more cookies/scripts by purpose.
 * "essential" is always required and cannot be toggled off.
 */
export interface ConsentCategory {
  /** Unique identifier, e.g. "analytics", "marketing" */
  id: string;
  /** Human-readable label (can be an i18n key) */
  label: string;
  /** Longer description shown in the settings modal */
  description?: string;
  /** If true, this category cannot be declined (e.g. essential cookies) */
  required?: boolean;
  /** Optional list of concrete cookies/services in this category */
  services?: ConsentService[];
}

/**
 * A concrete cookie or third-party service within a category.
 */
export interface ConsentService {
  /** Unique identifier */
  id: string;
  /** Display name */
  label: string;
  /** Description of what this service does */
  description?: string;
  /** Cookie names set by this service (used for auto-clear on revocation) */
  cookies?: string[];
}

/**
 * The user's consent choices, keyed by category id.
 */
export type ConsentChoices = Record<string, boolean>;

/**
 * A timestamped, versioned consent record for logging/proof.
 */
export interface ConsentRecord {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Config revision — changes when categories or banner text change */
  revision: string;
  /** The actual choices */
  choices: ConsentChoices;
  /** How the decision was made (or 'revoke' for a withdrawal) */
  method: 'accept-all' | 'reject-all' | 'custom' | 'revoke';
  /**
   * High-level action this record represents:
   * - `grant`: the visitor's first consent decision
   * - `update`: consent changed after a prior decision
   * - `revoke`: consent fully withdrawn
   *
   * Set automatically by {@link ConsentManager}.
   */
  action?: 'grant' | 'update' | 'revoke';
  /**
   * Pseudonymous, stable per-browser identifier, persisted in the consent
   * cookie. Ties multiple consent decisions of the same visitor together for
   * audit proof — without storing any personal data. Generated automatically.
   */
  subjectId?: string;
  /**
   * Optional user-agent string. Only attached to records sent via the built-in
   * consent logger when `logging.includeUserAgent` is enabled — never stored in
   * the cookie.
   */
  userAgent?: string;
}

/**
 * Options for the built-in server-side consent logger.
 *
 * When configured (via `KeksmeisterConfig.logging`), every consent decision
 * (grant, update, revoke) is POSTed to `endpoint` as JSON. Delivery prefers
 * `navigator.sendBeacon` so it survives the page navigation after "Accept all",
 * and falls back to `fetch(..., { keepalive: true })`. Failed sends are buffered
 * in `localStorage` and retried on the next page load.
 */
export interface ConsentLoggerOptions {
  /** URL that receives consent records via HTTP POST (`application/json`). */
  endpoint: string;
  /**
   * Transport strategy:
   * - `auto` (default): prefer `sendBeacon`, fall back to `fetch`
   * - `beacon`: only `sendBeacon` (with `fetch` fallback if it returns false)
   * - `fetch`: always `fetch`
   *
   * Note: `sendBeacon` cannot set custom headers — if `headers` are given,
   * `fetch` is always used.
   */
  transport?: 'auto' | 'beacon' | 'fetch';
  /** Extra headers, applied to the `fetch` transport only. */
  headers?: Record<string, string>;
  /** Attach `navigator.userAgent` to each sent record. Default: false. */
  includeUserAgent?: boolean;
  /** localStorage key for the offline retry queue. Default: `keksmeister_consent_queue`. */
  queueKey?: string;
  /** Max number of records kept in the offline queue. Default: 50. */
  maxQueueSize?: number;
}

/**
 * Translations for the banner and modal UI.
 */
export interface KeksmeisterTranslations {
  banner: {
    title?: string;
    description: string;
    acceptAll: string;
    rejectAll: string;
    settings: string;
  };
  modal: {
    title: string;
    description?: string;
    save: string;
    acceptAll: string;
    rejectAll: string;
    /** Label shown on required categories (default: "Always active" / "Immer aktiv") */
    alwaysActive?: string;
  };
  /** Label for the privacy policy link */
  privacyLink?: string;
  /** Label for the trigger button (default: "Cookie-Einstellungen" / "Cookie Settings") */
  trigger?: { label?: string };
  /** Per-category label overrides (keyed by category id) */
  categories?: Record<string, { label?: string; description?: string }>;
}

/**
 * Full configuration for a Keksmeister instance.
 */
export interface KeksmeisterConfig {
  /** Consent categories to display */
  categories: ConsentCategory[];
  /** URL to the privacy policy page */
  privacyUrl: string;
  /** Optional URL to the imprint page */
  imprintUrl?: string;
  /** Language code for built-in translations, or custom translations object */
  lang?: string | KeksmeisterTranslations;
  /** Config revision string — bump this when categories or text change to trigger re-consent */
  revision?: string;
  /** Cookie name used to store consent (default: "keksmeister_consent") */
  cookieName?: string;
  /** Cookie lifetime in days (default: 365) */
  cookieLifetimeDays?: number;
  /** Cookie domain (default: current domain) */
  cookieDomain?: string;
  /** Called when the user gives or updates consent */
  onConsent?: (record: ConsentRecord) => void;
  /**
   * Enable the built-in server-side consent logger. Every consent decision
   * (grant, update, and revoke) is POSTed to the configured endpoint, with an
   * offline retry queue. Independent of `onConsent` — and, unlike `onConsent`,
   * it also fires on revocation, so withdrawals are part of the audit trail.
   */
  logging?: ConsentLoggerOptions;
  /** Called when consent is revoked for a specific category */
  onRevoke?: (categoryId: string) => void;
  /** If true, auto-clear cookies of declined services (default: true) */
  autoClearCookies?: boolean;
  /** If true, enable Google Consent Mode v2 integration (default: false) */
  googleConsentMode?: boolean;
  /**
   * Map Google Consent Mode signals to custom category IDs.
   * Only used when `googleConsentMode` is true.
   * Defaults: analytics_storage → 'analytics', ad_storage → 'marketing', functionality_storage → 'functional'
   */
  googleConsentModeMapping?: {
    analytics_storage?: string;
    ad_storage?: string;
    ad_user_data?: string;
    ad_personalization?: string;
    functionality_storage?: string;
  };
  /**
   * Re-prompt for consent after this many days, even if the cookie hasn't expired.
   * Useful for CNIL compliance (recommended: 180 days / 6 months).
   * Default: undefined (no re-prompt, consent valid until cookie expires)
   */
  consentMaxAgeDays?: number;
  /**
   * Consent mode:
   * - 'opt-in' (default): No cookies until user consents (GDPR/DSGVO).
   * - 'opt-out': All non-essential cookies active by default, user can opt out (CCPA).
   */
  mode?: 'opt-in' | 'opt-out';
  /** If true, show individual services under each category in the settings modal */
  showServices?: boolean;
}

/**
 * Events dispatched by Keksmeister components.
 */
export interface KeksmeisterEventMap {
  'keksmeister:consent': CustomEvent<ConsentRecord>;
  'keksmeister:revoke': CustomEvent<{ categoryId: string }>;
  'keksmeister:open': CustomEvent<void>;
  'keksmeister:close': CustomEvent<void>;
}
