// Core (headless, no UI)
export {
  ConsentManager,
  CookieStore,
  ScriptBlocker,
  ServiceRegistry,
} from './core/index.js';

// UI (Web Component)
export { KeksmeisterBanner } from './ui/index.js';

// Types
export type {
  ConsentCategory,
  ConsentChoices,
  ConsentRecord,
  ConsentService,
  KeksmeisterConfig,
  KeksmeisterEventMap,
  KeksmeisterTranslations,
  ServiceAdapter,
} from './core/index.js';

// i18n
export { de, en, resolveTranslations } from './i18n/index.js';

// Auto-register the Web Component when this module is imported
import { KeksmeisterBanner } from './ui/keksmeister-banner.js';

if (typeof customElements !== 'undefined' && !customElements.get('keksmeister-banner')) {
  customElements.define('keksmeister-banner', KeksmeisterBanner);
}
