// Core (headless, no UI)
//
// Imported directly from their own modules rather than through
// `./core/index.js`: that barrel also statically re-exports the real
// `ConsentLogger` (for the `keksmeister/core` subpath, built separately via
// `tsc`). Routing through it here would pull the real, eager logger
// implementation into this bundled entry's static import graph and defeat
// the dynamic import in `lazy-consent-logger.ts` (Rollup cannot chunk-split
// a module that's also statically reachable — see `INEFFECTIVE_DYNAMIC_IMPORT`).
export { ConsentManager } from './core/consent-manager.js';
export { CookieStore } from './core/cookie-store.js';
export { ScriptBlocker } from './core/script-blocker.js';
export { ServiceRegistry } from './core/service-adapter.js';

// ConsentLogger is re-exported as the lazy-loading facade so the ~2.3 kB
// gzip implementation is only fetched when server-side logging is actually
// used, rather than being bundled into the main chunk unconditionally. It
// implements the same public API (`log`, `logSnapshot`, `flush`), buffering
// calls until the real logger has loaded. Import from `keksmeister/core` for
// the real, eagerly-loaded class instead.
export {
  LazyConsentLogger as ConsentLogger,
  createConsentLogger,
} from './core/lazy-consent-logger.js';

// UI (Web Components)
export { KeksmeisterBanner } from './ui/index.js';
export { KeksmeisterTrigger } from './ui/index.js';

// Types
export type {
  ConsentCategory,
  ConsentChoices,
  ConsentConfigSnapshot,
  ConsentLoggerOptions,
  ConsentRecord,
  ConsentService,
  KeksmeisterConfig,
  KeksmeisterEventMap,
  KeksmeisterTranslations,
  ServiceAdapter,
} from './core/index.js';

// i18n (de + en available via keksmeister/i18n/de and keksmeister/i18n/en)
export { resolveTranslations, registerTranslation } from './i18n/index.js';

// Auto-register Web Components when this module is imported
import { KeksmeisterBanner } from './ui/keksmeister-banner.js';
import { KeksmeisterTrigger } from './ui/keksmeister-trigger.js';

if (typeof customElements !== 'undefined') {
  if (!customElements.get('keksmeister-banner')) {
    customElements.define('keksmeister-banner', KeksmeisterBanner);
  }
  if (!customElements.get('keksmeister-trigger')) {
    customElements.define('keksmeister-trigger', KeksmeisterTrigger);
  }
}
