import type { ConsentManager } from './consent-manager.js';

/**
 * Script blocker that prevents tagged scripts from executing
 * until the user consents to the corresponding category.
 *
 * Scripts are tagged in the HTML like this:
 *
 *   <script type="text/plain" data-keksmeister="analytics" data-src="https://..."></script>
 *
 * Or for inline scripts:
 *
 *   <script type="text/plain" data-keksmeister="marketing">
 *     // This code runs only after marketing consent
 *   </script>
 *
 * The ScriptBlocker watches for consent changes and activates
 * scripts whose category has been accepted.
 */
export class ScriptBlocker {
  private manager: ConsentManager;
  private observer: MutationObserver | null = null;
  private activated = new WeakSet<Element>();
  private consentHandler: (() => void) | null = null;

  constructor(manager: ConsentManager) {
    this.manager = manager;
  }

  /** Start watching the DOM and activate consented scripts. */
  start(): void {
    // Activate already-present scripts
    this.scanAndActivate();

    // Watch for dynamically added scripts
    this.observer = new MutationObserver((mutations) => {
      let hasNewScripts = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (this.isBlockedScript(node) || node.querySelector?.('script[data-keksmeister]')) {
              hasNewScripts = true;
              break;
            }
          }
        }
        if (hasNewScripts) break;
      }
      if (hasNewScripts) {
        this.scanAndActivate();
      }
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Re-scan when consent changes
    this.consentHandler = () => this.scanAndActivate();
    this.manager.addEventListener('keksmeister:consent', this.consentHandler);
  }

  /** Stop watching the DOM and listening for consent changes. */
  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.consentHandler) {
      this.manager.removeEventListener('keksmeister:consent', this.consentHandler);
      this.consentHandler = null;
    }
  }

  /** Scan all blocked scripts and activate those with accepted categories. */
  private scanAndActivate(): void {
    const scripts = document.querySelectorAll<HTMLScriptElement>(
      'script[data-keksmeister]'
    );

    for (const script of scripts) {
      if (this.activated.has(script)) continue;

      const category = script.getAttribute('data-keksmeister');
      if (!category) continue;

      if (this.manager.isAccepted(category)) {
        this.activateScript(script);
        this.activated.add(script);
      }
    }
  }

  /**
   * Replace a blocked script with an executable copy.
   * We cannot simply change type="text/plain" to type="text/javascript"
   * because browsers won't re-evaluate scripts that were already in the DOM.
   * Instead, we create a fresh <script> element.
   */
  private activateScript(blocked: HTMLScriptElement): void {
    const script = document.createElement('script');

    // Copy all attributes except type and data-keksmeister
    for (const attr of blocked.attributes) {
      if (attr.name === 'type' || attr.name === 'data-keksmeister') continue;
      // data-src → src
      if (attr.name === 'data-src') {
        script.setAttribute('src', attr.value);
      } else {
        script.setAttribute(attr.name, attr.value);
      }
    }

    // Copy inline content
    if (!script.src && blocked.textContent) {
      script.textContent = blocked.textContent;
    }

    // Replace the blocked script
    blocked.parentNode?.replaceChild(script, blocked);
    // Track the new element too
    this.activated.add(script);
  }

  private isBlockedScript(node: Element): boolean {
    return (
      node.tagName === 'SCRIPT' && node.hasAttribute('data-keksmeister')
    );
  }
}
