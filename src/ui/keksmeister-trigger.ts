/**
 * <keksmeister-trigger> — Small floating button to re-open cookie settings.
 *
 * Place this anywhere on the page. When clicked, it calls `openSettings()`
 * on the nearest `<keksmeister-banner>` element.
 *
 * Usage:
 *   <keksmeister-trigger></keksmeister-trigger>
 *
 * Attributes:
 *   - position: "bottom-left" (default) | "bottom-right"
 *   - banner-selector: CSS selector for the banner element (default: "keksmeister-banner")
 *   - label: Button label for screen readers (default: "Cookie Settings")
 *
 * Theming (CSS Custom Properties from keksmeister-banner also work here):
 *   --km-trigger-size: 40px
 *   --km-trigger-bg: var(--km-primary, #1a1a1a)
 *   --km-trigger-color: var(--km-primary-text, #ffffff)
 *   --km-trigger-offset: 16px
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

  private render(): void {
    if (!this.shadowRoot) return;

    const position = this.getAttribute('position') ?? 'bottom-left';
    const label = this.getAttribute('label') ?? 'Cookie Settings';

    const style = document.createElement('style');
    style.textContent = /* css */ `
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
        button {
          transition: none;
        }
      }

      @media print {
        :host { display: none !important; }
      }
    `;

    const button = document.createElement('button');
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.textContent = '\u{1F36A}'; // 🍪
    button.addEventListener('click', () => this.openBanner());

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
