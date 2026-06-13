import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeksmeisterBanner } from './keksmeister-banner.js';
import type { KeksmeisterConfig } from '../core/types.js';
import { it as itTranslations } from '../i18n/it.js';
import { registerTranslation } from '../i18n/index.js';
import { clearCookies } from '../test-utils.js';

registerTranslation('it', itTranslations);

if (!customElements.get('keksmeister-banner')) {
  customElements.define('keksmeister-banner', KeksmeisterBanner);
}

function baseConfig(overrides: Partial<KeksmeisterConfig> = {}): KeksmeisterConfig {
  return {
    categories: [
      { id: 'essential', label: 'Essential', required: true },
      { id: 'analytics', label: 'Analytics' },
    ],
    privacyUrl: '/privacy',
    lang: 'en',
    ...overrides,
  };
}

function mountBanner(config: KeksmeisterConfig): KeksmeisterBanner {
  const el = document.createElement('keksmeister-banner') as KeksmeisterBanner;
  document.body.appendChild(el);
  el.config = config;
  return el;
}

describe('KeksmeisterBanner — closeAsReject (Garante Provv. 231)', () => {
  beforeEach(() => {
    clearCookies();
    document.body.replaceChildren();
  });

  it('does not render a close button by default', () => {
    const el = mountBanner(baseConfig());
    const close = el.shadowRoot?.querySelector('.km-banner__close');
    expect(close).toBeNull();
  });

  it('renders a close button and explicit hint when closeAsReject is on', () => {
    const el = mountBanner(baseConfig({ closeAsReject: true }));
    const close = el.shadowRoot?.querySelector<HTMLButtonElement>('.km-banner__close');
    expect(close).not.toBeNull();
    expect(close!.getAttribute('aria-label')).toMatch(/reject/i);

    const hint = el.shadowRoot?.querySelector('.km-banner__close-hint');
    expect(hint?.textContent).toMatch(/rejection/i);
  });

  it('clicking the close button records a full rejection', () => {
    const onConsent = vi.fn();
    const el = mountBanner(baseConfig({ closeAsReject: true, onConsent }));
    const close = el.shadowRoot?.querySelector<HTMLButtonElement>('.km-banner__close');
    close!.click();

    expect(onConsent).toHaveBeenCalledOnce();
    const record = onConsent.mock.calls[0]![0];
    expect(record.method).toBe('reject-all');
    expect(record.choices.essential).toBe(true);
    expect(record.choices.analytics).toBe(false);
    expect(el.manager?.hasConsented).toBe(true);
  });

  it('Escape key counts as rejection when closeAsReject is on', () => {
    const onConsent = vi.fn();
    const el = mountBanner(baseConfig({ closeAsReject: true, onConsent }));

    el.shadowRoot!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );

    expect(onConsent).toHaveBeenCalledOnce();
    expect(onConsent.mock.calls[0]![0].method).toBe('reject-all');
  });

  it('Escape key does not reject when closeAsReject is off', () => {
    const onConsent = vi.fn();
    const el = mountBanner(baseConfig({ onConsent }));

    el.shadowRoot!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );

    expect(onConsent).not.toHaveBeenCalled();
  });

  it('localises the close-button label and hint when the IT translations are picked', () => {
    const el = mountBanner(baseConfig({ closeAsReject: true, lang: 'it' }));
    const close = el.shadowRoot?.querySelector<HTMLButtonElement>('.km-banner__close');
    expect(close!.getAttribute('aria-label')).toMatch(/rifiuta/i);
    const hint = el.shadowRoot?.querySelector('.km-banner__close-hint');
    expect(hint?.textContent).toMatch(/rifiuto/i);
  });
});
