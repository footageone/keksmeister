import type { ConsentManager } from './consent-manager.js';

/**
 * A ServiceAdapter controls a third-party service that is managed
 * programmatically (via JavaScript API) rather than by script blocking.
 *
 * Many modern analytics libraries (PostHog, Matomo, Mixpanel,
 * Meta Pixel, etc.) provide their own opt-in/opt-out mechanisms. These
 * services are typically already loaded on the page and just need to be
 * told whether they have consent or not.
 *
 * This is fundamentally different from script blocking (where a `<script>`
 * tag is prevented from loading). Both approaches are supported by
 * Keksmeister:
 *
 * - **Script blocking:** `<script type="text/plain" data-keksmeister="analytics">`
 *   → handled by `ScriptBlocker`
 *
 * - **Programmatic consent:** `new PostHogAdapter(posthog)`
 *   → handled by `ServiceAdapter` + `ServiceRegistry`
 *
 * ## Creating a custom adapter
 *
 * ```ts
 * const myAdapter: ServiceAdapter = {
 *   id: 'my-tool',
 *   category: 'analytics',
 *   onConsent: () => myTool.startTracking(),
 *   onRevoke: () => myTool.stopTracking(),
 * };
 * ```
 */
export interface ServiceAdapter {
  /** Unique identifier for this service */
  id: string;
  /** Which consent category this service belongs to */
  category: string;
  /** Called when the user grants consent for this category */
  onConsent: () => void;
  /** Called when the user revokes consent for this category */
  onRevoke: () => void;
}

/**
 * Registry that connects ServiceAdapters to a ConsentManager.
 *
 * When consent changes, the registry automatically calls onConsent/onRevoke
 * on all registered adapters for the affected categories.
 */
export class ServiceRegistry {
  private adapters: ServiceAdapter[] = [];
  private manager: ConsentManager;
  private consentHandler = () => this.syncAll();
  private revokeHandler = () => this.revokeAll();

  constructor(manager: ConsentManager) {
    this.manager = manager;

    // Listen for consent changes
    this.manager.addEventListener('keksmeister:consent', this.consentHandler);
    this.manager.addEventListener('keksmeister:revoke', this.revokeHandler);
  }

  /** Remove event listeners and clean up. */
  destroy(): void {
    this.manager.removeEventListener('keksmeister:consent', this.consentHandler);
    this.manager.removeEventListener('keksmeister:revoke', this.revokeHandler);
  }

  /** Register a service adapter. Immediately syncs its state. */
  register(adapter: ServiceAdapter): void {
    this.adapters.push(adapter);
    this.syncAdapter(adapter);
  }

  /** Unregister a service adapter by id. */
  unregister(id: string): void {
    this.adapters = this.adapters.filter((a) => a.id !== id);
  }

  /** Get all registered adapters. */
  getAdapters(): readonly ServiceAdapter[] {
    return this.adapters;
  }

  /** Sync all adapters with current consent state. */
  syncAll(): void {
    for (const adapter of this.adapters) {
      this.syncAdapter(adapter);
    }
  }

  private syncAdapter(adapter: ServiceAdapter): void {
    if (this.manager.isAccepted(adapter.category)) {
      adapter.onConsent();
    } else if (this.manager.hasConsented) {
      // Only revoke if the user has actively made a choice
      adapter.onRevoke();
    }
  }

  private revokeAll(): void {
    for (const adapter of this.adapters) {
      adapter.onRevoke();
    }
  }
}
