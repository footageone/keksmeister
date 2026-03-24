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
 * Accessibility:
 *   - Banner and modal use role="dialog" with aria-label
 *   - Modal has aria-modal="true" and full focus trap (Tab/Shift+Tab cycle)
 *   - Escape closes modal/banner
 *   - Toggle labels are associated with inputs via <label>
 *   - Focus-visible outlines on all interactive elements
 *   - respects prefers-reduced-motion
 */
export class KeksmeisterBanner extends HTMLElement {
  static readonly tagName = 'keksmeister-banner';

  private _manager: ConsentManager | null = null;
  private blocker: ScriptBlocker | null = null;
  private translations!: KeksmeisterTranslations;
  private _config: KeksmeisterConfig | null = null;
  private _view: 'banner' | 'modal' | 'hidden' = 'banner';
  private previouslyFocusedElement: HTMLElement | null = null;

  /** Set the full config programmatically. */
  set config(value: KeksmeisterConfig) {
    this._config = value;
    this.initialize();
  }

  get config(): KeksmeisterConfig | null {
    return this._config;
  }

  /** Access the underlying ConsentManager (e.g. for ServiceRegistry). */
  get manager(): ConsentManager | null {
    return this._manager;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (!this._config) {
      const config = this.buildConfigFromAttributes();
      if (config) {
        this._config = config;
        this.initialize();
      }
    }
  }

  disconnectedCallback(): void {
    this.blocker?.stop();
  }

  /** Open the settings modal programmatically. */
  openSettings(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this._view = 'modal';
    this.render();
  }

  /** Show the banner again (e.g. from a "Cookie Settings" footer link). */
  show(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this._view = 'banner';
    this.render();
  }

  // --- Private ---

  private initialize(): void {
    if (!this._config) return;

    this.translations = resolveTranslations(this._config.lang);
    this._manager = new ConsentManager(this._config);
    this.blocker = new ScriptBlocker(this._manager);
    this.blocker.start();

    this._view = this._manager.shouldShowBanner ? 'banner' : 'hidden';
    this.render();
  }

  private render(): void {
    if (!this.shadowRoot) return;

    this.shadowRoot.replaceChildren();

    const styleEl = document.createElement('style');
    styleEl.textContent = bannerStyles;
    this.shadowRoot.appendChild(styleEl);

    switch (this._view) {
      case 'banner':
        this.shadowRoot.appendChild(this.buildBannerDOM());
        this.hidden = false;
        this.bindBannerEvents();
        this.focusFirst();
        break;
      case 'modal':
        this.shadowRoot.appendChild(this.buildModalDOM());
        this.hidden = false;
        this.bindModalEvents();
        this.focusFirst();
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
      const titleId = 'km-banner-title';
      const title = document.createElement('h2');
      title.className = 'km-banner__title';
      title.id = titleId;
      title.textContent = t.title;
      inner.appendChild(title);
      banner.setAttribute('aria-labelledby', titleId);
    }

    const descId = 'km-banner-desc';
    const text = document.createElement('p');
    text.className = 'km-banner__text';
    text.id = descId;
    text.textContent = t.description;
    inner.appendChild(text);
    banner.setAttribute('aria-describedby', descId);

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
      link.textContent = this.translations.privacyLink ?? 'Datenschutzerklärung';
      privacyDiv.appendChild(link);
      inner.appendChild(privacyDiv);
    }

    banner.appendChild(inner);
    return banner;
  }

  private buildModalDOM(): HTMLElement {
    const t = this.translations.modal;
    const categories = this._manager!.getCategories();
    const choices = this._manager!.getChoices();
    const alwaysActiveLabel = t.alwaysActive ?? 'Always active';

    const overlay = document.createElement('div');
    overlay.className = 'km-overlay';
    overlay.dataset.action = 'close-modal';

    const modal = document.createElement('div');
    modal.className = 'km-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const titleId = 'km-modal-title';
    const title = document.createElement('h2');
    title.className = 'km-modal__title';
    title.id = titleId;
    title.textContent = t.title;
    modal.setAttribute('aria-labelledby', titleId);
    modal.appendChild(title);

    if (t.description) {
      const descId = 'km-modal-desc';
      const desc = document.createElement('p');
      desc.className = 'km-modal__description';
      desc.id = descId;
      desc.textContent = t.description;
      modal.setAttribute('aria-describedby', descId);
      modal.appendChild(desc);
    }

    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'km-categories';
    categoriesContainer.setAttribute('role', 'group');
    categoriesContainer.setAttribute('aria-label', t.title);

    for (const cat of categories) {
      const catTranslation = this.translations.categories?.[cat.id];
      const label = catTranslation?.label ?? cat.label;
      const description = catTranslation?.description ?? cat.description ?? '';
      const checked = cat.required || choices[cat.id] === true;
      const inputId = `km-cat-${cat.id}`;
      const descriptionId = `km-cat-desc-${cat.id}`;

      const categoryEl = document.createElement('div');
      categoryEl.className = 'km-category';

      const header = document.createElement('div');
      header.className = 'km-category__header';

      const labelContainer = document.createElement('div');
      const labelEl = document.createElement('label');
      labelEl.className = 'km-category__label';
      labelEl.setAttribute('for', inputId);
      labelEl.textContent = label;
      labelContainer.appendChild(labelEl);

      if (cat.required) {
        const badge = document.createElement('span');
        badge.className = 'km-category__badge';
        badge.setAttribute('aria-hidden', 'true');
        badge.textContent = alwaysActiveLabel;
        labelContainer.appendChild(document.createTextNode(' '));
        labelContainer.appendChild(badge);
      }

      const toggle = document.createElement('div');
      toggle.className = 'km-toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = inputId;
      input.dataset.category = cat.id;
      input.checked = checked;
      input.disabled = cat.required === true;
      input.setAttribute('role', 'switch');
      input.setAttribute('aria-checked', String(checked));
      if (description) {
        input.setAttribute('aria-describedby', descriptionId);
      }
      if (cat.required) {
        input.setAttribute('aria-label', `${label} (${alwaysActiveLabel})`);
      }
      const track = document.createElement('span');
      track.className = 'km-toggle__track';
      track.setAttribute('aria-hidden', 'true');
      toggle.append(input, track);

      header.append(labelContainer, toggle);
      categoryEl.appendChild(header);

      if (description) {
        const descEl = document.createElement('p');
        descEl.className = 'km-category__description';
        descEl.id = descriptionId;
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
          this._manager!.acceptAll();
          this.hide();
          break;
        case 'reject-all':
          this._manager!.rejectAll();
          this.hide();
          break;
        case 'settings':
          this.previouslyFocusedElement = document.activeElement as HTMLElement;
          this._view = 'modal';
          this.render();
          break;
      }
    });

    // Escape closes the banner
    this.shadowRoot?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        // Don't auto-hide on Escape in banner mode — the user hasn't consented yet.
        // Instead, move focus to the first button.
        const first = this.shadowRoot?.querySelector<HTMLElement>('button');
        first?.focus();
      }
    });
  }

  private bindModalEvents(): void {
    this.shadowRoot?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;

      switch (target.dataset.action) {
        case 'save':
          this._manager!.saveCustom(this.readModalChoices());
          this.hide();
          break;
        case 'accept-all':
          this._manager!.acceptAll();
          this.hide();
          break;
        case 'reject-all':
          this._manager!.rejectAll();
          this.hide();
          break;
        case 'close-modal':
          if (e.target === target) {
            this._view = 'banner';
            this.render();
          }
          break;
      }
    });

    // Update aria-checked when toggles change
    this.shadowRoot?.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.dataset.category) {
        input.setAttribute('aria-checked', String(input.checked));
      }
    });

    // Keyboard: Escape closes modal, Tab trapping
    const modal = this.shadowRoot?.querySelector<HTMLElement>('.km-modal');
    if (modal) {
      modal.addEventListener('keydown', (e) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Escape') {
          this._view = 'banner';
          this.render();
          return;
        }
        if (ke.key === 'Tab') {
          this.handleTabTrap(ke, modal);
        }
      });
    }
  }

  /**
   * Trap Tab focus within the modal.
   * Shift+Tab on the first element wraps to the last; Tab on the last wraps to the first.
   */
  private handleTabTrap(e: KeyboardEvent, container: HTMLElement): void {
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, input:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && this.shadowRoot?.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && this.shadowRoot?.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  private readModalChoices(): ConsentChoices {
    const choices: ConsentChoices = {};
    const checkboxes = this.shadowRoot?.querySelectorAll<HTMLInputElement>(
      'input[data-category]'
    );
    if (checkboxes) {
      for (const cb of checkboxes) {
        choices[cb.dataset.category!] = cb.checked;
      }
    }
    return choices;
  }

  private hide(): void {
    this._view = 'hidden';
    this.render();
    this.dispatchEvent(new CustomEvent('keksmeister:close'));
    // Restore focus to the element that was focused before the banner/modal opened
    this.previouslyFocusedElement?.focus();
    this.previouslyFocusedElement = null;
  }

  private focusFirst(): void {
    requestAnimationFrame(() => {
      const firstFocusable = this.shadowRoot?.querySelector<HTMLElement>(
        'button, input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    });
  }

  private buildConfigFromAttributes(): KeksmeisterConfig | null {
    const privacyUrl = this.getAttribute('privacy-url');
    if (!privacyUrl) return null;

    // Auto-detect language from attribute, document lang, or navigator
    const lang = this.getAttribute('lang')
      ?? document.documentElement.lang?.split('-')[0]
      ?? navigator.language?.split('-')[0]
      ?? 'de';

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
