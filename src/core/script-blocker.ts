import type { ConsentManager } from './consent-manager.js';

/**
 * Per-tag placeholder → real attribute mappings. Aligned with EDPB
 * Guidelines 02/2023 v2.0 (October 2024) on the technical scope of
 * Art. 5(3) ePrivacy: not just `<script>` but also pixel-based
 * trackers via `<img>`, `<iframe>`, `<link>`, `<source>`, `<video>`
 * and `<audio>` must be gated behind consent because each can fire a
 * network request that "gains access to information" on the visitor's
 * device.
 *
 * `<a>` is intentionally not in scope: anchors only request the URL
 * when the user actively clicks, so they don't fire pre-consent.
 */
const PLACEHOLDER_MAP: Record<string, ReadonlyArray<readonly [string, string]>> = {
  SCRIPT: [['data-src', 'src']],
  IMG: [
    ['data-src', 'src'],
    ['data-srcset', 'srcset'],
  ],
  IFRAME: [['data-src', 'src']],
  LINK: [['data-href', 'href']],
  SOURCE: [
    ['data-src', 'src'],
    ['data-srcset', 'srcset'],
  ],
  VIDEO: [
    ['data-src', 'src'],
    ['data-poster', 'poster'],
  ],
  AUDIO: [['data-src', 'src']],
};

const BLOCKED_TAGS = Object.keys(PLACEHOLDER_MAP);
const BLOCKED_SELECTOR = BLOCKED_TAGS.map(
  (tag) => `${tag.toLowerCase()}[data-keksmeister]`
).join(',');

/**
 * Consent-gated resource blocker. Holds tagged elements inert until the
 * matching category is granted, then activates them in place.
 *
 * Tagging in HTML:
 *
 *   <script type="text/plain" data-keksmeister="analytics" data-src="https://…"></script>
 *   <img data-keksmeister="marketing" data-src="https://example.com/pixel.gif" />
 *   <iframe data-keksmeister="marketing" data-src="https://…embed…" />
 *   <link data-keksmeister="analytics" data-href="https://…/preload.css" rel="preload" as="style">
 *
 * For `<script>` the element is replaced with a fresh `<script>` so the
 * browser actually parses and executes it (changing `type` on an existing
 * script never re-runs it). For every other tag, the placeholder
 * attribute is just flipped to the real attribute (e.g. `data-src` →
 * `src`), which triggers the browser's normal fetch path.
 *
 * The blocker re-scans on every consent change and watches the DOM for
 * dynamically added tags via `MutationObserver`.
 */
export class ScriptBlocker {
  #manager: ConsentManager;
  #observer: MutationObserver | null = null;
  #activated = new WeakSet<Element>();
  #consentHandler: (() => void) | null = null;

  constructor(manager: ConsentManager) {
    this.#manager = manager;
  }

  /** Start watching the DOM and activate consented resources. */
  start(): void {
    this.#scanAndActivate();

    this.#observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (this.#isBlockedElement(node) || node.querySelector?.(BLOCKED_SELECTOR)) {
            this.#scanAndActivate();
            return;
          }
        }
      }
    });

    this.#observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Re-scan when consent changes
    this.#consentHandler = () => this.#scanAndActivate();
    this.#manager.addEventListener('keksmeister:consent', this.#consentHandler);
  }

  /** Stop watching the DOM and listening for consent changes. */
  stop(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#consentHandler) {
      this.#manager.removeEventListener('keksmeister:consent', this.#consentHandler);
      this.#consentHandler = null;
    }
  }

  /** Scan blocked elements and activate those with accepted categories. */
  #scanAndActivate(): void {
    const elements = document.querySelectorAll<HTMLElement>(BLOCKED_SELECTOR);
    for (const el of elements) {
      if (this.#activated.has(el)) continue;

      const category = el.getAttribute('data-keksmeister');
      if (!category) continue;

      if (this.#manager.isAccepted(category)) {
        this.#activateElement(el);
        this.#activated.add(el);
      }
    }
  }

  #activateElement(blocked: HTMLElement): void {
    if (blocked.tagName === 'SCRIPT') {
      this.#activateScript(blocked as HTMLScriptElement);
      return;
    }
    this.#flipPlaceholders(blocked);
  }

  /**
   * Replace a blocked script with an executable copy. Necessary because
   * browsers don't re-evaluate a script element once it has been parsed,
   * regardless of later attribute changes.
   */
  #activateScript(blocked: HTMLScriptElement): void {
    const script = document.createElement('script');

    for (const attr of blocked.attributes) {
      if (attr.name === 'type' || attr.name === 'data-keksmeister') continue;
      if (attr.name === 'data-src') {
        script.setAttribute('src', attr.value);
      } else {
        script.setAttribute(attr.name, attr.value);
      }
    }

    if (!script.src && blocked.textContent) {
      script.textContent = blocked.textContent;
    }

    blocked.parentNode?.replaceChild(script, blocked);
    this.#activated.add(script);
  }

  /**
   * For `<img>`/`<iframe>`/`<link>`/etc., flip every known placeholder
   * attribute to its real counterpart and remove the gating attributes.
   * Setting `src` (or `href`, `srcset`, …) is what triggers the browser
   * to issue the network request, so we never had a request before.
   */
  #flipPlaceholders(blocked: HTMLElement): void {
    const mappings = PLACEHOLDER_MAP[blocked.tagName] ?? [];
    for (const [from, to] of mappings) {
      const value = blocked.getAttribute(from);
      if (value === null) continue;
      blocked.setAttribute(to, value);
      blocked.removeAttribute(from);
    }
    blocked.removeAttribute('data-keksmeister');
  }

  #isBlockedElement(node: Element): boolean {
    return (
      BLOCKED_TAGS.includes(node.tagName) && node.hasAttribute('data-keksmeister')
    );
  }
}
