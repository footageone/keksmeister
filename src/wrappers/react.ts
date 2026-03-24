/**
 * React wrapper for Keksmeister Web Components.
 *
 * Usage:
 *   import { KeksmeisterBanner, KeksmeisterTrigger } from 'keksmeister/react';
 *
 *   function App() {
 *     return (
 *       <>
 *         <KeksmeisterBanner
 *           config={{
 *             categories: [...],
 *             privacyUrl: '/privacy',
 *             onConsent: (record) => console.log(record),
 *           }}
 *         />
 *         <KeksmeisterTrigger position="bottom-left" />
 *       </>
 *     );
 *   }
 *
 * Note: This wrapper has zero React dependencies at build time.
 * It uses the global React types and expects React to be available at runtime.
 */

import type { KeksmeisterConfig } from '../core/types.js';
import { KeksmeisterBanner as BannerElement } from '../ui/keksmeister-banner.js';
import { KeksmeisterTrigger as TriggerElement } from '../ui/keksmeister-trigger.js';

// Register custom elements
if (typeof customElements !== 'undefined') {
  if (!customElements.get('keksmeister-banner')) {
    customElements.define('keksmeister-banner', BannerElement);
  }
  if (!customElements.get('keksmeister-trigger')) {
    customElements.define('keksmeister-trigger', TriggerElement);
  }
}

/** Props for the KeksmeisterBanner React component. */
export interface KeksmeisterBannerProps {
  /** Full Keksmeister configuration. */
  config?: KeksmeisterConfig;
  /** Privacy policy URL (shorthand, used when config is not provided). */
  privacyUrl?: string;
  /** Language code or translations object. */
  lang?: string;
  /** Config revision for re-consent. */
  revision?: string;
  /** Called when the banner closes (consent given or dismissed). */
  onClose?: () => void;
}

/** Props for the KeksmeisterTrigger React component. */
export interface KeksmeisterTriggerProps {
  /** Position of the floating button. */
  position?: 'bottom-left' | 'bottom-right';
  /** CSS selector for the banner element. */
  bannerSelector?: string;
  /** Accessible label. */
  label?: string;
}

/**
 * React component that wraps <keksmeister-banner>.
 *
 * Handles the config-as-object pattern that Web Components don't natively
 * support via HTML attributes.
 */
export function KeksmeisterBanner(props: KeksmeisterBannerProps): unknown {
  // Dynamically import React hooks to avoid hard dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = (globalThis as Record<string, unknown>).React as {
    useRef: <T>(init: T | null) => { current: T | null };
    useEffect: (fn: () => void | (() => void), deps: unknown[]) => void;
    createElement: (
      type: string,
      props: Record<string, unknown> | null,
    ) => unknown;
  };

  if (!React) {
    throw new Error('keksmeister/react requires React to be available globally or imported.');
  }

  const ref = React.useRef<BannerElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (props.config) {
      el.config = props.config;
    }

    if (props.onClose) {
      const handler = props.onClose;
      el.addEventListener('keksmeister:close', handler);
      return () => el.removeEventListener('keksmeister:close', handler);
    }
  }, [props.config, props.onClose]);

  return React.createElement('keksmeister-banner', {
    ref,
    'privacy-url': props.privacyUrl,
    lang: props.lang,
    revision: props.revision,
  });
}

/**
 * React component that wraps <keksmeister-trigger>.
 */
export function KeksmeisterTrigger(props: KeksmeisterTriggerProps): unknown {
  const React = (globalThis as Record<string, unknown>).React as {
    createElement: (
      type: string,
      props: Record<string, unknown> | null,
    ) => unknown;
  };

  if (!React) {
    throw new Error('keksmeister/react requires React to be available globally or imported.');
  }

  return React.createElement('keksmeister-trigger', {
    position: props.position,
    'banner-selector': props.bannerSelector,
    label: props.label,
  });
}
