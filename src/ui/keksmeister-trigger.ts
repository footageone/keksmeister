import { resolveTranslations } from '../i18n/index.js';
import { detectLanguage } from './shared.js';
import baseStyles from './trigger.css?inline';
import iconStyles from './trigger-icon.css?inline';
import textStyles from './trigger-text.css?inline';
import slotStyles from './trigger-slot.css?inline';

/**
 * <keksmeister-trigger> — Button to re-open cookie settings.
 *
 * Three variants:
 *   - `variant="icon"` (default): Small floating circle with a 🍪 emoji.
 *   - `variant="text"`: Inline button showing the label text with a 🍪 prefix.
 *   - **Slotted content**: When the element has child content, it renders a
 *     minimal button wrapper around a `<slot>`, giving you full control.
 *
 * Attributes:
 *   - variant: "icon" (default) | "text" — ignored when slotted content is present
 *   - position: "bottom-left" (default) | "bottom-right" (only for icon variant)
 *   - banner-selector: CSS selector for the banner element (default: "keksmeister-banner")
 *   - label: Button label — overrides i18n default.
 *   - lang: Language code for i18n (default: auto-detect from document/navigator)
 *
 * Theming (CSS Custom Properties):
 *   --km-trigger-size: 40px (icon variant)
 *   --km-trigger-bg: var(--km-primary, #1a1a1a)
 *   --km-trigger-color: var(--km-primary-text, #ffffff)
 *   --km-trigger-offset: 16px (icon variant)
 */
export class KeksmeisterTrigger extends HTMLElement {
  static readonly tagName = 'keksmeister-trigger';
  static readonly observedAttributes = ['variant', 'position', 'label', 'lang', 'banner-selector'];

  private static readonly _variantCSS: Record<string, string> = {
    icon: iconStyles,
    text: textStyles,
    slot: slotStyles,
  };

  private _hasSlottedContent = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._hasSlottedContent = this.hasChildNodes() && this.innerHTML.trim().length > 0;
    this.render();
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return;
    this.render();
  }

  private resolveLabel(): string {
    const explicit = this.getAttribute('label');
    if (explicit) return explicit;
    const translations = resolveTranslations(detectLanguage(this));
    return translations.trigger?.label ?? 'Cookie-Einstellungen';
  }

  private resolveVariant(): 'icon' | 'text' | 'slot' {
    if (this._hasSlottedContent) return 'slot';
    return this.getAttribute('variant') === 'text' ? 'text' : 'icon';
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const variant = this.resolveVariant();
    const label = this.resolveLabel();

    // Icon position via CSS class on the host
    this.classList.toggle('km-right', variant === 'icon' && this.getAttribute('position') === 'bottom-right');

    const style = document.createElement('style');
    style.textContent = baseStyles + KeksmeisterTrigger._variantCSS[variant];

    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.addEventListener('click', () => this.openBanner());

    if (variant === 'text') {
      const icon = document.createElement('span');
      icon.className = 'km-trigger__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '\u{1F36A}';
      const text = document.createElement('span');
      text.textContent = label;
      button.append(icon, text);
    } else if (variant === 'slot') {
      button.setAttribute('aria-label', label);
      button.appendChild(document.createElement('slot'));
    } else {
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.textContent = '\u{1F36A}';
    }

    this.shadowRoot.replaceChildren(style, button);
  }

  private openBanner(): void {
    const selector = this.getAttribute('banner-selector') ?? 'keksmeister-banner';
    const banner = document.querySelector(selector) as HTMLElement & { openSettings?: () => void } | null;
    if (banner?.openSettings) {
      banner.openSettings();
    }
  }
}
