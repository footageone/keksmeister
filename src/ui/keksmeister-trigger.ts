import { resolveTranslations } from '../i18n/index.js';

/**
 * <keksmeister-trigger> — Button to re-open cookie settings.
 *
 * Two variants:
 *   - `variant="icon"` (default): Small floating circle with a 🍪 emoji.
 *     Ideal for fixed-position placement in a corner of the page.
 *   - `variant="text"`: Inline button showing the label text with a 🍪 prefix.
 *     Ideal for embedding in a privacy page or footer.
 *
 * Usage:
 *   <!-- Floating icon button (default) -->
 *   <keksmeister-trigger></keksmeister-trigger>
 *
 *   <!-- Text button for embedding in a footer or privacy page -->
 *   <keksmeister-trigger variant="text"></keksmeister-trigger>
 *
 *   <!-- Custom label overrides i18n default -->
 *   <keksmeister-trigger variant="text" label="Cookies verwalten"></keksmeister-trigger>
 *
 * Attributes:
 *   - variant: "icon" (default) | "text"
 *   - position: "bottom-left" (default) | "bottom-right" (only for icon variant)
 *   - banner-selector: CSS selector for the banner element (default: "keksmeister-banner")
 *   - label: Button label — overrides i18n default. Used as aria-label (icon) or visible text (text).
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

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
  }

  private resolveLabel(): string {
    const explicit = this.getAttribute('label');
    if (explicit) return explicit;

    const lang = this.getAttribute('lang')
      ?? document.documentElement.lang?.split('-')[0]
      ?? navigator.language?.split('-')[0]
      ?? 'de';

    const translations = resolveTranslations(lang);
    return translations.trigger?.label ?? 'Cookie-Einstellungen';
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const variant = this.getAttribute('variant') ?? 'icon';
    const label = this.resolveLabel();

    const style = document.createElement('style');
    style.textContent = variant === 'text' ? this.textStyles() : this.iconStyles();

    const button = document.createElement('button');
    button.addEventListener('click', () => this.openBanner());

    if (variant === 'text') {
      button.setAttribute('type', 'button');
      const icon = document.createElement('span');
      icon.className = 'km-trigger__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '\u{1F36A}';
      const text = document.createElement('span');
      text.textContent = label;
      button.append(icon, text);
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

      @media (prefers-reduced-motion: reduce) {
        button { transition: none; }
      }

      @media print {
        :host { display: none !important; }
      }
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

      button:hover {
        opacity: 0.85;
      }

      button:focus-visible {
        outline: 2px solid var(--km-trigger-color);
        outline-offset: 2px;
      }

      .km-trigger__icon {
        font-size: 1.15em;
        line-height: 1;
      }

      @media (prefers-reduced-motion: reduce) {
        button { transition: none; }
      }

      @media print {
        :host { display: none !important; }
      }
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
