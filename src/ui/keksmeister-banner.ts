import { ConsentManager } from '../core/consent-manager.js';
import { ScriptBlocker } from '../core/script-blocker.js';
import type { ConsentChoices, KeksmeisterConfig, KeksmeisterTranslations } from '../core/types.js';
import { resolveTranslations } from '../i18n/index.js';
import { bannerStyles } from './styles.js';
import { detectLanguage } from './shared.js';

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
  static readonly observedAttributes = ['privacy-url', 'lang', 'categories', 'revision', 'cookie-name'];

  #manager: ConsentManager | null = null;
  #blocker: ScriptBlocker | null = null;
  #translations!: KeksmeisterTranslations;
  #config: KeksmeisterConfig | null = null;
  #view: 'banner' | 'modal' | 'hidden' = 'banner';
  #previouslyFocusedElement: HTMLElement | null = null;
  #listenerAbort: AbortController | null = null;
  #configFromAttributes = false;

  /** Set the full config programmatically. */
  set config(value: KeksmeisterConfig) {
    this.#config = value;
    this.#initialize();
  }

  get config(): KeksmeisterConfig | null {
    return this.#config;
  }

  /** Access the underlying ConsentManager (e.g. for ServiceRegistry). */
  get manager(): ConsentManager | null {
    return this.#manager;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (!this.#config) {
      const config = this.#buildConfigFromAttributes();
      if (config) {
        this.#config = config;
        this.#configFromAttributes = true;
        this.#initialize();
      }
    }
  }

  disconnectedCallback(): void {
    this.#blocker?.stop();
    this.#listenerAbort?.abort();
  }

  attributeChangedCallback(): void {
    // Skip if config was set programmatically (attributes are only the fallback)
    if (this.#config && !this.#configFromAttributes) return;
    // Skip if not yet connected to the DOM
    if (!this.isConnected) return;

    const config = this.#buildConfigFromAttributes();
    if (config) {
      this.#config = config;
      this.#configFromAttributes = true;
      this.#blocker?.stop();
      this.#initialize();
    }
  }

  /** Open the settings modal programmatically. */
  openSettings(): void {
    this.#previouslyFocusedElement = document.activeElement as HTMLElement;
    this.#view = 'modal';
    this.#render();
    this.dispatchEvent(new CustomEvent('keksmeister:open'));
  }

  /** Show the banner again (e.g. from a "Cookie Settings" footer link). */
  show(): void {
    this.#previouslyFocusedElement = document.activeElement as HTMLElement;
    this.#view = 'banner';
    this.#render();
    this.dispatchEvent(new CustomEvent('keksmeister:open'));
  }

  // --- Private ---

  #initialize(): void {
    if (!this.#config) return;

    this.#translations = resolveTranslations(this.#config.lang);
    this.#manager = new ConsentManager(this.#config);
    this.#blocker = new ScriptBlocker(this.#manager);
    this.#blocker.start();

    // Send the banner-config snapshot once per revision so the actually-rendered
    // texts (after i18n resolution) end up in the audit log (DSK-OH Rn. 85).
    this.#manager.sendConfigSnapshot(
      this.#manager.getConfigSnapshot({ translations: this.#translations })
    );

    this.#view = this.#manager.shouldShowBanner ? 'banner' : 'hidden';
    this.#render();
  }

  #render(): void {
    if (!this.shadowRoot) return;

    this.#listenerAbort?.abort();
    this.#listenerAbort = new AbortController();

    this.shadowRoot.replaceChildren();

    const styleEl = document.createElement('style');
    styleEl.textContent = bannerStyles;
    this.shadowRoot.appendChild(styleEl);

    switch (this.#view) {
      case 'banner':
        this.shadowRoot.appendChild(this.#buildBannerDOM());
        this.hidden = false;
        this.#bindBannerEvents();
        this.#focusFirst();
        break;
      case 'modal':
        this.shadowRoot.appendChild(this.#buildModalDOM());
        this.hidden = false;
        this.#bindModalEvents();
        this.#focusFirst();
        break;
      case 'hidden':
        this.hidden = true;
        break;
    }
  }

  #buildBannerDOM(): HTMLElement {
    const t = this.#translations.banner;

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

    const acceptBtn = this.#createButton(t.acceptAll, 'accept-all', 'km-btn--primary');
    const rejectBtn = this.#createButton(t.rejectAll, 'reject-all', 'km-btn--secondary');
    const settingsBtn = this.#createButton(t.settings, 'settings', 'km-btn--link');

    actions.append(acceptBtn, rejectBtn, settingsBtn);
    inner.appendChild(actions);

    if (this.#config?.closeAsReject) {
      // Italian Garante (Provv. 231): the close affordance must exist AND
      // the banner must say what it does. Both pieces are added together so
      // operators can't accidentally ship the icon without the notice.
      banner.appendChild(this.#buildCloseButton());
      const hint = document.createElement('p');
      hint.className = 'km-banner__close-hint';
      hint.textContent =
        t.closeRejectHint ?? 'Closing this banner counts as a rejection.';
      inner.appendChild(hint);
    }

    if (this.#config?.privacyUrl) {
      const privacyDiv = document.createElement('div');
      privacyDiv.className = 'km-privacy-link';
      const link = document.createElement('a');
      link.href = this.#config.privacyUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = this.#translations.privacyLink ?? 'Datenschutzerklärung';
      privacyDiv.appendChild(link);
      inner.appendChild(privacyDiv);
    }

    banner.appendChild(inner);
    return banner;
  }

  #buildCloseButton(): HTMLButtonElement {
    const t = this.#translations.banner;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'km-banner__close';
    btn.dataset.action = 'close-reject';
    btn.setAttribute(
      'aria-label',
      t.closeReject ?? 'Close and reject all cookies'
    );
    btn.textContent = '×'; // ×
    return btn;
  }

  #buildModalDOM(): HTMLElement {
    const t = this.#translations.modal;
    const categories = this.#manager!.getCategories();
    const choices = this.#manager!.getChoices();
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
      const catTranslation = this.#translations.categories?.[cat.id];
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

      const toggle = document.createElement('label');
      toggle.className = 'km-toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = inputId;
      input.dataset.category = cat.id;
      input.checked = checked;
      input.disabled = cat.required === true;
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

      // Show individual services if configured
      if (this.#config?.showServices && cat.services?.length) {
        const servicesList = document.createElement('ul');
        servicesList.className = 'km-services';
        for (const service of cat.services) {
          const li = document.createElement('li');
          li.className = 'km-service';
          const nameSpan = document.createElement('span');
          nameSpan.className = 'km-service__name';
          nameSpan.textContent = service.label;
          li.appendChild(nameSpan);
          if (service.description) {
            const sDescSpan = document.createElement('span');
            sDescSpan.className = 'km-service__description';
            sDescSpan.textContent = ` — ${service.description}`;
            li.appendChild(sDescSpan);
          }
          if (service.cookies?.length) {
            const cookieSpan = document.createElement('span');
            cookieSpan.className = 'km-service__cookies';
            cookieSpan.textContent = ` (${service.cookies.join(', ')})`;
            li.appendChild(cookieSpan);
          }
          servicesList.appendChild(li);
        }
        categoryEl.appendChild(servicesList);
      }

      categoriesContainer.appendChild(categoryEl);
    }

    modal.appendChild(categoriesContainer);

    const actions = document.createElement('div');
    actions.className = 'km-modal__actions';
    // Layer 2: accept-all and reject-all must remain equally accessible. The
    // reject button was previously styled as a text link, which gave it less
    // visual weight than accept and conflicted with DSK-OH Rn. 135.
    actions.append(
      this.#createButton(t.save, 'save', 'km-btn--primary'),
      this.#createButton(t.acceptAll, 'accept-all', 'km-btn--secondary'),
      this.#createButton(t.rejectAll, 'reject-all', 'km-btn--secondary'),
    );
    modal.appendChild(actions);

    overlay.appendChild(modal);
    return overlay;
  }

  #createButton(text: string, action: string, className: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `km-btn ${className}`;
    btn.dataset.action = action;
    btn.textContent = text;
    return btn;
  }

  #bindBannerEvents(): void {
    const signal = this.#listenerAbort!.signal;

    this.shadowRoot?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;

      switch (target.dataset.action) {
        case 'accept-all':
          this.#manager!.acceptAll();
          this.#hide();
          break;
        case 'reject-all':
        case 'close-reject':
          this.#manager!.rejectAll();
          this.#hide();
          break;
        case 'settings':
          this.#previouslyFocusedElement = document.activeElement as HTMLElement;
          this.#view = 'modal';
          this.#render();
          break;
      }
    }, { signal });

    this.shadowRoot?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key !== 'Escape') return;
      if (this.#config?.closeAsReject) {
        // closeAsReject is on → Escape is the keyboard equivalent of the
        // × button: treat it as a rejection, same as Garante Provv. 231
        // requires from the close affordance.
        this.#manager!.rejectAll();
        this.#hide();
        return;
      }
      // Default: don't auto-hide on Escape — the user hasn't consented yet.
      // Move focus to the first button so keyboard users stay oriented.
      const first = this.shadowRoot?.querySelector<HTMLElement>('button');
      first?.focus();
    }, { signal });
  }

  #bindModalEvents(): void {
    const signal = this.#listenerAbort!.signal;

    this.shadowRoot?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;

      switch (target.dataset.action) {
        case 'save':
          this.#manager!.saveCustom(this.#readModalChoices());
          this.#hide();
          break;
        case 'accept-all':
          this.#manager!.acceptAll();
          this.#hide();
          break;
        case 'reject-all':
          this.#manager!.rejectAll();
          this.#hide();
          break;
        case 'close-modal':
          if (e.target === target) {
            this.#view = 'banner';
            this.#render();
          }
          break;
      }
    }, { signal });

    // Keyboard: Escape closes modal, Tab trapping
    const modal = this.shadowRoot?.querySelector<HTMLElement>('.km-modal');
    if (modal) {
      modal.addEventListener('keydown', (e) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Escape') {
          this.#view = 'banner';
          this.#render();
          return;
        }
        if (ke.key === 'Tab') {
          this.#handleTabTrap(ke, modal);
        }
      }, { signal });
    }
  }

  /**
   * Trap Tab focus within the modal.
   * Shift+Tab on the first element wraps to the last; Tab on the last wraps to the first.
   */
  #handleTabTrap(e: KeyboardEvent, container: HTMLElement): void {
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

  #readModalChoices(): ConsentChoices {
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

  #hide(): void {
    this.#view = 'hidden';
    this.#render();
    this.dispatchEvent(new CustomEvent('keksmeister:close'));
    // Restore focus to the element that was focused before the banner/modal opened
    this.#previouslyFocusedElement?.focus();
    this.#previouslyFocusedElement = null;
  }

  #focusFirst(): void {
    requestAnimationFrame(() => {
      const firstFocusable = this.shadowRoot?.querySelector<HTMLElement>(
        'button, input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    });
  }

  #buildConfigFromAttributes(): KeksmeisterConfig | null {
    const privacyUrl = this.getAttribute('privacy-url');
    if (!privacyUrl) return null;

    const lang = detectLanguage(this);

    const categoriesAttr = this.getAttribute('categories');

    let categories = [
      { id: 'essential', label: 'Essential', required: true },
      { id: 'functional', label: 'Functional' },
      { id: 'analytics', label: 'Analytics' },
      { id: 'marketing', label: 'Marketing' },
    ];

    if (categoriesAttr) {
      try {
        const ids = (JSON.parse(categoriesAttr) as string[]).filter((id) => id !== 'essential');
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
