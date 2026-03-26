import { resolveTranslations } from '../i18n/index.js';
import { detectLanguage, triggerMediaCSS } from './shared.js';

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
 */
export class KeksmeisterTrigger extends HTMLElement {
  static readonly tagName = 'keksmeister-trigger';
  static readonly observedAttributes = ['variant', 'position', 'label', 'lang', 'banner-selector'];

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
    const attr = this.getAttribute('variant');
    if (attr === 'text') return 'text';
    return 'icon';
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const variant = this.resolveVariant();
    const label = this.resolveLabel();

    const style = document.createElement('style');
    if (variant === 'icon') {
      style.textContent = this.iconStyles();
    } else if (variant === 'text') {
      style.textContent = this.textStyles();
    } else {
      style.textContent = this.slotStyles();
    }

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

  private iconStyles(): string {
    const position = this.getAttribute('position') ?? 'bottom-left';
    return /* css */ `
      :host {
        --km-trigger-size: 40px;
        --km-trigger-bg: var(--km-primary, #1a1a1a);
        --km-trigger-color: var(--km-primary-text, #ffffff);
        --km-trigger-offset: 16px;
        display: block;
        position: fixed;
        ${position === 'bottom-right' ? 'right' : 'left'}: var(--km-trigger-offset);
        bottom: var(--km-trigger-offset);
        z-index: 9999;
      }
      button {
        width: var(--km-trigger-size);
        height: var(--km-trigger-size);
        border-radius: 50%;
        border: none;
        background: var(--km-trigger-bg);
        color: var(--km-trigger-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        padding: 0;
        font-size: 20px;
        line-height: 1;
      }
      button:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      button:focus-visible {
        outline: 2px solid var(--km-trigger-color);
        outline-offset: 2px;
      }
      ${triggerMediaCSS}
    `;
  }

  private textStyles(): string {
    return /* css */ `
      :host {
        --km-trigger-bg: var(--km-primary, #1a1a1a);
        --km-trigger-color: var(--km-primary-text, #ffffff);
        display: inline-block;
      }
      button {
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        border: none;
        background: var(--km-trigger-bg);
        color: var(--km-trigger-color);
        cursor: pointer;
        padding: 0.5em 1em;
        border-radius: 6px;
        font: inherit;
        font-size: 0.875em;
        line-height: 1.4;
        transition: opacity 0.2s ease;
      }
      button:hover { opacity: 0.85; }
      button:focus-visible {
        outline: 2px solid var(--km-trigger-color);
        outline-offset: 2px;
      }
      .km-trigger__icon { font-size: 1.15em; line-height: 1; }
      ${triggerMediaCSS}
    `;
  }

  private slotStyles(): string {
    return /* css */ `
      :host { display: inline; }
      button {
        display: inline;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        text-align: inherit;
        text-decoration: inherit;
        line-height: inherit;
      }
      button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
        border-radius: 2px;
      }
      ${triggerMediaCSS}
    `;
  }

  private openBanner(): void {
    const selector = this.getAttribute('banner-selector') ?? 'keksmeister-banner';
    const banner = document.querySelector(selector) as HTMLElement & { openSettings?: () => void } | null;
    if (banner?.openSettings) {
      banner.openSettings();
    }
  }
}
