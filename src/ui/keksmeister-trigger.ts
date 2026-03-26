import { resolveTranslations } from '../i18n/index.js';
import { detectLanguage } from './shared.js';
import triggerStyles from './trigger.css?inline';

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

  /** Internal variable names used by trigger.css. */
  private static readonly _vars = [
    '--_km-display', '--_km-position', '--_km-left', '--_km-right',
    '--_km-bottom', '--_km-z', '--_km-btn-display', '--_km-btn-size',
    '--_km-btn-bg', '--_km-btn-color', '--_km-btn-radius', '--_km-btn-padding',
    '--_km-btn-shadow', '--_km-btn-font-size', '--_km-btn-line-height',
    '--_km-btn-transition', '--_km-hover-transform', '--_km-hover-shadow',
    '--_km-hover-opacity', '--_km-focus-color',
  ] as const;

  /** Variant presets: maps internal variable names to values. */
  private static readonly _presets: Record<string, Record<string, string>> = {
    icon: {
      '--_km-display': 'block',
      '--_km-position': 'fixed',
      '--_km-bottom': 'var(--km-trigger-offset)',
      '--_km-z': '9999',
      '--_km-btn-display': 'flex',
      '--_km-btn-size': 'var(--km-trigger-size)',
      '--_km-btn-bg': 'var(--km-trigger-bg)',
      '--_km-btn-color': 'var(--km-trigger-color)',
      '--_km-btn-radius': '50%',
      '--_km-btn-shadow': '0 2px 8px rgba(0,0,0,0.2)',
      '--_km-btn-font-size': '20px',
      '--_km-btn-line-height': '1',
      '--_km-btn-transition': 'transform 0.2s ease, box-shadow 0.2s ease',
      '--_km-hover-transform': 'scale(1.1)',
      '--_km-hover-shadow': '0 4px 12px rgba(0,0,0,0.3)',
      '--_km-focus-color': 'var(--km-trigger-color)',
    },
    text: {
      '--_km-display': 'inline-block',
      '--_km-btn-display': 'inline-flex',
      '--_km-btn-bg': 'var(--km-trigger-bg)',
      '--_km-btn-color': 'var(--km-trigger-color)',
      '--_km-btn-radius': '6px',
      '--_km-btn-padding': '0.5em 1em',
      '--_km-btn-font-size': '0.875em',
      '--_km-btn-line-height': '1.4',
      '--_km-btn-transition': 'opacity 0.2s ease',
      '--_km-hover-opacity': '0.85',
      '--_km-focus-color': 'var(--km-trigger-color)',
    },
    // slot: empty — CSS fallback defaults apply (inline, transparent, inherit)
    slot: {},
  };

  /**
   * Set internal --_km-* CSS variables on the host element
   * to control variant-specific styling from a single CSS file.
   */
  private applyVariantStyles(variant: 'icon' | 'text' | 'slot'): void {
    const preset = KeksmeisterTrigger._presets[variant];

    // Reset all, then apply preset
    for (const v of KeksmeisterTrigger._vars) {
      if (preset[v]) {
        this.style.setProperty(v, preset[v]);
      } else {
        this.style.removeProperty(v);
      }
    }

    // Icon variant: dynamic position side
    if (variant === 'icon') {
      const side = this.getAttribute('position') === 'bottom-right' ? '--_km-right' : '--_km-left';
      this.style.setProperty(side, 'var(--km-trigger-offset)');
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const variant = this.resolveVariant();
    const label = this.resolveLabel();

    this.applyVariantStyles(variant);

    const style = document.createElement('style');
    style.textContent = triggerStyles;

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
