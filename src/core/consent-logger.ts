import type { ConsentLoggerOptions, ConsentRecord } from './types.js';

const DEFAULT_QUEUE_KEY = 'keksmeister_consent_queue';
const DEFAULT_MAX_QUEUE = 50;

/**
 * Reliable, fire-and-forget transport for consent records.
 *
 * - Prefers `navigator.sendBeacon` so a record survives the page navigation
 *   that often follows "Accept all".
 * - Falls back to `fetch(..., { keepalive: true })` (and always uses `fetch`
 *   when custom headers are configured, since beacons cannot set headers).
 * - Buffers failed sends in `localStorage` and retries them on construction
 *   (i.e. the next page load) and after the next successful send.
 *
 * The class is environment-tolerant: it reads `navigator`, `fetch` and
 * `localStorage` lazily and degrades gracefully when any are unavailable.
 */
export class ConsentLogger {
  private readonly endpoint: string;
  private readonly transport: 'auto' | 'beacon' | 'fetch';
  private readonly headers: Record<string, string>;
  private readonly includeUserAgent: boolean;
  private readonly queueKey: string;
  private readonly maxQueueSize: number;

  constructor(options: ConsentLoggerOptions) {
    this.endpoint = options.endpoint;
    this.transport = options.transport ?? 'auto';
    this.headers = options.headers ?? {};
    this.includeUserAgent = options.includeUserAgent ?? false;
    this.queueKey = options.queueKey ?? DEFAULT_QUEUE_KEY;
    this.maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE;

    // Drain anything left over from a previous session.
    void this.flush();
  }

  /** Send one consent record. Falls back to the offline queue on failure. */
  log(record: ConsentRecord): void {
    const payload = this.enrich(record);
    void this.dispatch(payload).then((ok) => {
      if (ok) {
        void this.flush();
      } else {
        this.enqueue(payload);
      }
    });
  }

  /** Attempt to resend any queued records (via fetch, so success is confirmed). */
  async flush(): Promise<void> {
    if (this.isOffline()) return;
    const queue = this.readQueue();
    if (queue.length === 0) return;

    const remaining: ConsentRecord[] = [];
    for (const item of queue) {
      const ok = await this.dispatchFetch(item);
      if (!ok) remaining.push(item);
    }
    this.writeQueue(remaining);
  }

  private enrich(record: ConsentRecord): ConsentRecord {
    if (this.includeUserAgent) {
      const ua = globalThis.navigator?.userAgent;
      if (ua) return { ...record, userAgent: ua };
    }
    return record;
  }

  private async dispatch(payload: ConsentRecord): Promise<boolean> {
    const canBeacon =
      typeof globalThis.navigator?.sendBeacon === 'function' &&
      Object.keys(this.headers).length === 0;

    if (this.transport === 'beacon' || (this.transport === 'auto' && canBeacon)) {
      if (this.sendBeacon(payload)) return true;
      // Beacon refused the payload — fall through to fetch.
    }
    return this.dispatchFetch(payload);
  }

  private sendBeacon(payload: ConsentRecord): boolean {
    try {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });
      return globalThis.navigator.sendBeacon(this.endpoint, blob);
    } catch {
      return false;
    }
  }

  private async dispatchFetch(payload: ConsentRecord): Promise<boolean> {
    if (typeof globalThis.fetch !== 'function') return false;
    try {
      const res = await globalThis.fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...this.headers },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private enqueue(payload: ConsentRecord): void {
    const queue = this.readQueue();
    queue.push(payload);
    // Keep only the most recent N records.
    while (queue.length > this.maxQueueSize) queue.shift();
    this.writeQueue(queue);
  }

  private readQueue(): ConsentRecord[] {
    try {
      const raw = globalThis.localStorage?.getItem(this.queueKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ConsentRecord[]) : [];
    } catch {
      return [];
    }
  }

  private writeQueue(queue: ConsentRecord[]): void {
    try {
      if (queue.length === 0) {
        globalThis.localStorage?.removeItem(this.queueKey);
      } else {
        globalThis.localStorage?.setItem(this.queueKey, JSON.stringify(queue));
      }
    } catch {
      /* storage unavailable — best effort, drop silently */
    }
  }

  private isOffline(): boolean {
    return globalThis.navigator?.onLine === false;
  }
}

/** Convenience factory mirroring the `create<Thing>()` style used elsewhere. */
export function createConsentLogger(options: ConsentLoggerOptions): ConsentLogger {
  return new ConsentLogger(options);
}
