import { ConsentManager } from '../core/consent-manager.js';
import { ScriptBlocker } from '../core/script-blocker.js';
import type { ConsentChoices, KeksmeisterConfig, KeksmeisterTranslations } from '../core/types.js';
import { resolveTranslations } from '../i18n/index.js';
import { bannerStyles } from './styles.js';

/**
 * <keksmeister-banner> — Cookie consent banner Web Component.
 *
 * Usage:
 *   <keksmeister-banner
 *     privacy-url="/datenschutz"
 *     lang="de"
 *   ></keksmeister-banner>
 *
 * Or configure via JavaScript:
 *   const el = document.querySelector('keksmeister-banner');
 *   el.config = { categories: [...], privacyUrl: '/datenschutz' };
 *
 * Security note: All dynamic content is escaped via escapeHtml() before
 * being inserted. No user-supplied HTML is rendered. A future iteration
 * may switch to programmatic DOM construction for defense-in-depth.
 */
export class KeksmeisterBanner extends HTMLElement {
  static readonly tagName = 'keksmeister-banner';

  private manager!: ConsentManager;
  private blocker!: ScriptBlocker;
  private translations!: KeksmeisterTranslations;
  private _config: KeksmeisterConfig | null = null;
  private _view: 'banner' | 'modal' | 'hidden' = 'banner';

  /** Set the full config programmatically. */
  set config(value: KeksmeisterConfig) {
    this._config = value;
    this.initialize();
  }

  get config(): KeksmeisterConfig | null {
    return this._config;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    // If config was not set programmatically, try to build from attributes
    if (!this._config) {
      const config = this.buildConfigFromAttributes();
      if (config) {
        this._config = config;
        this.initialize();
      }
    }
  }

  /** Open the settings modal programmatically. */
  openSettings(): void {
    this._view = 'modal';
    this.render();
  }

  /** Show the banner again (e.g. from a "Cookie Settings" footer link). */
  show(): void {
    this._view = 'banner';
    this.render();
  }

  // --- Private ---

  private initialize(): void {
    if (!this._config) return;

    this.translations = resolveTranslations(this._config.lang);
    this.manager = new ConsentManager(this._config);
    this.blocker = new ScriptBlocker(this.manager);
    this.blocker.start();

    this._view = this.manager.shouldShowBanner ? 'banner' : 'hidden';
    this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;

    // Clear previous content
    this.shadowRoot.replaceChildren();

    // Add styles
    const styleEl = document.createElement('style');
    styleEl.textContent = bannerStyles;
    this.shadowRoot.appendChild(styleEl);

    switch (this._view) {
      case 'banner':
        this.shadowRoot.appendChild(this.buildBannerDOM());
        this.hidden = false;
        this.bindBannerEvents();
        this.trapFocus();
        break;
      case 'modal':
        this.shadowRoot.appendChild(this.buildModalDOM());
        this.hidden = false;
        this.bindModalEvents();
        this.trapFocus();
        break;
      case 'hidden':
        this.hidden = true;
        break;
    }
  }

  private buildBannerDOM(): HTMLElement {
    const t = this.translations.banner;

    const banner = document.createElement('div');
    banner.className = 'km-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-label', t.title ?? 'Cookie Consent');

    const inner = document.createElement('div');
    inner.className = 'km-banner__inner';

    if (t.title) {
      const title = document.createElement('h2');
      title.className = 'km-banner__title';
      title.textContent = t.title;
      inner.appendChild(title);
    }

    const text = document.createElement('p');
    text.className = 'km-banner__text';
    text.textContent = t.description;
    inner.appendChild(text);

    const actions = document.createElement('div');
    actions.className = 'km-banner__actions';

    const acceptBtn = this.createButton(t.acceptAll, 'accept-all', 'km-btn--primary');
    const rejectBtn = this.createButton(t.rejectAll, 'reject-all', 'km-btn--secondary');
    const settingsBtn = this.createButton(t.settings, 'settings', 'km-btn--link');

    actions.append(acceptBtn, rejectBtn, settingsBtn);
    inner.appendChild(actions);

    if (this._config?.privacyUrl) {
      const privacyDiv = document.createElement('div');
      privacyDiv.className = 'km-privacy-link';
      const link = document.createElement('a');
      link.href = this._config.privacyUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Datenschutz';
      privacyDiv.appendChild(link);
      inner.appendChild(privacyDiv);
    }

    banner.appendChild(inner);
    return banner;
  }

  private buildModalDOM(): HTMLElement {
    const t = this.translations.modal;
    const categories = this.manager.getCategories();
    const choices = this.manager.getChoices();

    const overlay = document.createElement('div');
    overlay.className = 'km-overlay';
    overlay.dataset.action = 'close-modal';

    const modal = document.createElement('div');
    modal.className = 'km-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', t.title);

    const title = document.createElement('h2');
    title.className = 'km-modal__title';
    title.textContent = t.title;
    modal.appendChild(title);

    if (t.description) {
      const desc = document.createElement('p');
      desc.className = 'km-modal__description';
      desc.textContent = t.description;
      modal.appendChild(desc);
    }

    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'km-categories';

    for (const cat of categories) {
      const catTranslation = this.translations.categories?.[cat.id];
      const label = catTranslation?.label ?? cat.label;
      const description = catTranslation?.description ?? cat.description ?? '';
      const checked = cat.required || choices[cat.id] === true;

      const categoryEl = document.createElement('div');
      categoryEl.className = 'km-category';

      const header = document.createElement('div');
      header.className = 'km-category__header';

      const labelContainer = document.createElement('div');
      const labelSpan = document.createElement('span');
      labelSpan.className = 'km-category__label';
      labelSpan.textContent = label;
      labelContainer.appendChild(labelSpan);

      if (cat.required) {
        const badge = document.createElement('span');
        badge.className = 'km-category__badge';
        badge.textContent = 'Immer aktiv';
        labelContainer.appendChild(document.createTextNode(' '));
        labelContainer.appendChild(badge);
      }

      const toggle = document.createElement('label');
      toggle.className = 'km-toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.category = cat.id;
      input.checked = checked;
      input.disabled = cat.required === true;
      const track = document.createElement('span');
      track.className = 'km-toggle__track';
      toggle.append(input, track);

      header.append(labelContainer, toggle);
      categoryEl.appendChild(header);

      if (description) {
        const descEl = document.createElement('p');
        descEl.className = 'km-category__description';
        descEl.textContent = description;
        categoryEl.appendChild(descEl);
      }

      categoriesContainer.appendChild(categoryEl);
    }

    modal.appendChild(categoriesContainer);

    const actions = document.createElement('div');
    actions.className = 'km-modal__actions';
    actions.append(
      this.createButton(t.save, 'save', 'km-btn--primary'),
      this.createButton(t.acceptAll, 'accept-all', 'km-btn--secondary'),
      this.createButton(t.rejectAll, 'reject-all', 'km-btn--link'),
    );
    modal.appendChild(actions);

    overlay.appendChild(modal);
    return overlay;
  }

  private createButton(text: string, action: string, className: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `km-btn ${className}`;
    btn.dataset.action = action;
    btn.textContent = text;
    return btn;
  }

  private bindBannerEvents(): void {
    this.shadowRoot?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;

      switch (target.dataset.action) {
        case 'accept-all':
          this.manager.acceptAll();
          this.hide();
          break;
        case 'reject-all':
          this.manager.rejectAll();
          this.hide();
          break;
        case 'settings':
          this._view = 'modal';
          this.render();
          break;
      }
    });
  }

  private bindModalEvents(): void {
    this.shadowRoot?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;

      switch (target.dataset.action) {
        case 'save':
          this.manager.saveCustom(this.readModalChoices());
          this.hide();
          break;
        case 'accept-all':
          this.manager.acceptAll();
          this.hide();
          break;
        case 'reject-all':
          this.manager.rejectAll();
          this.hide();
          break;
        case 'close-modal':
          // Only close if clicking the overlay itself, not the modal content
          if (e.target === target) {
            this._view = 'banner';
            this.render();
          }
          break;
      }
    });

    // Close on Escape
    this.shadowRoot
      ?.querySelector('.km-overlay')
      ?.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Escape') {
          this._view = 'banner';
          this.render();
        }
      });
  }

  private readModalChoices(): ConsentChoices {
    const choices: ConsentChoices = {};
    const checkboxes = this.shadowRoot?.querySelectorAll<HTMLInputElement>(
      'input[data-category]'
    );
    if (checkboxes) {
      for (const cb of checkboxes) {
        const id = cb.dataset.category!;
        choices[id] = cb.checked;
      }
    }
    return choices;
  }

  private hide(): void {
    this._view = 'hidden';
    this.render();
    this.dispatchEvent(new CustomEvent('keksmeister:close'));
  }

  private trapFocus(): void {
    // Focus the first button for a11y
    requestAnimationFrame(() => {
      const firstButton = this.shadowRoot?.querySelector<HTMLElement>(
        'button, [tabindex="0"]'
      );
      firstButton?.focus();
    });
  }

  private buildConfigFromAttributes(): KeksmeisterConfig | null {
    const privacyUrl = this.getAttribute('privacy-url');
    if (!privacyUrl) return null;

    const lang = this.getAttribute('lang') ?? 'de';
    const categoriesAttr = this.getAttribute('categories');

    let categories = [
      { id: 'essential', label: 'Essential', required: true },
      { id: 'functional', label: 'Functional' },
      { id: 'analytics', label: 'Analytics' },
      { id: 'marketing', label: 'Marketing' },
    ];

    if (categoriesAttr) {
      try {
        const ids = JSON.parse(categoriesAttr) as string[];
        categories = [
          { id: 'essential', label: 'Essential', required: true },
          ...ids.map((id) => ({ id, label: id })),
        ];
      } catch {
        // Ignore parse errors, use defaults
      }
    }

    return {
      categories,
      privacyUrl,
      lang,
      revision: this.getAttribute('revision') ?? undefined,
      cookieName: this.getAttribute('cookie-name') ?? undefined,
    };
  }
}
