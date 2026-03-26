// Core (headless, no UI)
export {
  ConsentManager,
  CookieStore,
  ScriptBlocker,
  ServiceRegistry,
} from './core/index.js';

// UI (Web Components)
export { KeksmeisterBanner } from './ui/index.js';
export { KeksmeisterTrigger } from './ui/index.js';

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
