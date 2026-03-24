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
  /** How consent was given */
  method: 'accept-all' | 'reject-all' | 'custom';
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
  };
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
  /** Called when consent is revoked for a specific category */
  onRevoke?: (categoryId: string) => void;
  /** If true, auto-clear cookies of declined services (default: true) */
  autoClearCookies?: boolean;
  /** If true, enable Google Consent Mode v2 integration (default: false) */
  googleConsentMode?: boolean;
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
