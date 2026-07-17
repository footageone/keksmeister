import type {
  ConsentConfigSnapshot,
  ConsentLoggerOptions,
  ConsentRecord,
} from './types.js';

const DEFAULT_QUEUE_KEY = 'keksmeister_consent_queue';
const DEFAULT_MAX_QUEUE = 50;
const DEFAULT_SNAPSHOT_SENT_KEY_PREFIX = 'keksmeister_snapshot_sent_';

/**
 * Reliable, fire-and-forget transport for consent records.
 *
 * - Prefers `navigator.sendBeacon` so a record survives the page navigation
 *   that often follows "Accept all". The body uses a CORS-safelisted
 *   content-type (`text/plain` by default), so the beacon reaches cross-origin
 *   endpoints with no preflight and regardless of server CORS.
 * - If `contentType` is set to a non-safelisted type (e.g. `application/json`),
 *   a cross-origin beacon would need a preflight beacons cannot perform and be
 *   silently dropped, so `auto` falls back to `fetch(..., { keepalive: true })`
 *   for cross-origin endpoints. keepalive fetch survives navigation too.
 * - Always uses `fetch` when custom headers are configured (beacons cannot set
 *   headers). The `transport` option can force `'beacon'` or `'fetch'`.
 * - Buffers failed sends in `localStorage` and retries them on construction
 *   (i.e. the next page load) and after the next successful send.
 *
 * The class is environment-tolerant: it reads `navigator`, `fetch` and
 * `localStorage` lazily and degrades gracefully when any are unavailable.
 */
export class ConsentLogger {
  readonly #endpoint: string;
  readonly #snapshotEndpoint: string;
  readonly #transport: 'auto' | 'beacon' | 'fetch';
  readonly #contentType: string;
  readonly #headers: Record<string, string>;
  readonly #includeUserAgent: boolean;
  readonly #queueKey: string;
  readonly #maxQueueSize: number;
  readonly #snapshotSentKeyPrefix: string;
  /** Revisions whose snapshot upload is in-flight or already acknowledged. */
  readonly #snapshotInFlight = new Set<string>();

  constructor(options: ConsentLoggerOptions) {
    this.#endpoint = options.endpoint;
    this.#snapshotEndpoint = options.snapshotEndpoint ?? `${options.endpoint}/snapshot`;
    this.#transport = options.transport ?? 'auto';
    this.#contentType = options.contentType ?? 'text/plain;charset=UTF-8';
    this.#headers = options.headers ?? {};
    this.#includeUserAgent = options.includeUserAgent ?? false;
    this.#queueKey = options.queueKey ?? DEFAULT_QUEUE_KEY;
    this.#maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE;
    this.#snapshotSentKeyPrefix =
      options.snapshotSentKeyPrefix ?? DEFAULT_SNAPSHOT_SENT_KEY_PREFIX;

    // Drain anything left over from a previous session.
    void this.flush();
  }

  /** Send one consent record. Falls back to the offline queue on failure. */
  log(record: ConsentRecord): void {
    const payload = this.#enrich(record);
    void this.#dispatch(payload).then((ok) => {
      if (ok) {
        void this.flush();
      } else {
        this.#enqueue(payload);
      }
    });
  }

  /**
   * Upload a banner-config snapshot. Idempotent per revision: the first
   * successful upload for a given revision sets a localStorage flag, and later
   * calls for the same revision become no-ops until the flag is cleared. The
   * server should additionally dedupe on content hash (DSK-OH Rn. 85).
   *
   * Uses fetch only (not sendBeacon) because beacon's boolean return reflects
   * queueing, not delivery — we cannot set the per-revision dedup flag on a
   * value that doesn't represent an actual HTTP acknowledgement.
   */
  logSnapshot(snapshot: ConsentConfigSnapshot): void {
    if (this.#snapshotInFlight.has(snapshot.revision)) return;
    const key = `${this.#snapshotSentKeyPrefix}${snapshot.revision}`;
    try {
      if (globalThis.localStorage?.getItem(key)) return;
    } catch {
      /* storage unavailable — fall through and just send */
    }
    // Reserve the slot synchronously so concurrent calls dedupe even before the
    // network round-trip completes.
    this.#snapshotInFlight.add(snapshot.revision);
    void this.#dispatchFetchTo(this.#snapshotEndpoint, snapshot).then((ok) => {
      if (ok) {
        try {
          globalThis.localStorage?.setItem(key, '1');
        } catch {
          /* best effort */
        }
      } else {
        // Allow a retry on the next call.
        this.#snapshotInFlight.delete(snapshot.revision);
      }
    });
  }

  /** Attempt to resend any queued records (via fetch, so success is confirmed). */
  async flush(): Promise<void> {
    if (this.#isOffline()) return;
    const queue = this.#readQueue();
    if (queue.length === 0) return;

    // Send the queue front-to-back, stopping at the first failure so we don't
    // hammer a down endpoint with the whole backlog.
    let sentCount = 0;
    for (const item of queue) {
      if (!(await this.#dispatchFetch(item))) break;
      sentCount++;
    }
    if (sentCount === 0) return;

    // Re-read before writing: records appended by enqueue() during the awaits
    // above live at the tail, so dropping only the sent prefix preserves them.
    const current = this.#readQueue();
    this.#writeQueue(current.slice(sentCount));
  }

  #enrich(record: ConsentRecord): ConsentRecord {
    if (this.#includeUserAgent) {
      const ua = globalThis.navigator?.userAgent;
      if (ua) return { ...record, userAgent: ua };
    }
    return record;
  }

  #dispatch(payload: ConsentRecord): Promise<boolean> {
    return this.#dispatchTo(this.#endpoint, payload);
  }

  async #dispatchTo(url: string, payload: unknown): Promise<boolean> {
    const canBeacon =
      typeof globalThis.navigator?.sendBeacon === 'function' &&
      Object.keys(this.#headers).length === 0;

    // 'auto' avoids sendBeacon for cross-origin endpoints whose content-type is
    // NOT CORS-safelisted (e.g. application/json): such a beacon needs a
    // preflight beacons cannot perform, so the browser drops it while
    // sendBeacon() still returns true — silently losing the record. With a
    // safelisted content-type (the default text/plain) the beacon is a simple
    // request and reaches any origin without a preflight, so we keep it.
    // fetch(keepalive) survives navigation just as well. Explicit 'beacon' is
    // respected as-is — the caller opted in.
    const wantBeacon =
      this.#transport === 'beacon' ||
      (this.#transport === 'auto' &&
        (!this.#isCrossOrigin(url) || this.#isSafelistedContentType()));

    if (wantBeacon && canBeacon) {
      if (this.#sendBeacon(url, payload)) return true;
      // Beacon refused the payload — fall through to fetch.
    }
    return this.#dispatchFetchTo(url, payload);
  }

  /**
   * True when `url` resolves to a different origin than the current page.
   * Relative URLs and environments without a `location` are treated as
   * same-origin (the conservative default that preserves beacon usage).
   */
  #isCrossOrigin(url: string): boolean {
    const here = globalThis.location;
    if (!here?.origin) return false;
    try {
      return new URL(url, here.href).origin !== here.origin;
    } catch {
      return false;
    }
  }

  /**
   * True when `contentType`'s essence is CORS-safelisted, so a cross-origin
   * beacon is a "simple request" that needs no preflight. Parameters (e.g.
   * `;charset=UTF-8`) are ignored — only the type/subtype matters.
   */
  #isSafelistedContentType(): boolean {
    const essence = this.#contentType.split(';')[0]!.trim().toLowerCase();
    return (
      essence === 'text/plain' ||
      essence === 'application/x-www-form-urlencoded' ||
      essence === 'multipart/form-data'
    );
  }

  #sendBeacon(url: string, payload: unknown): boolean {
    try {
      const blob = new Blob([JSON.stringify(payload)], {
        type: this.#contentType,
      });
      return globalThis.navigator.sendBeacon(url, blob);
    } catch {
      return false;
    }
  }

  #dispatchFetch(payload: ConsentRecord): Promise<boolean> {
    return this.#dispatchFetchTo(this.#endpoint, payload);
  }

  async #dispatchFetchTo(url: string, payload: unknown): Promise<boolean> {
    if (typeof globalThis.fetch !== 'function') return false;
    try {
      const res = await globalThis.fetch(url, {
        method: 'POST',
        headers: this.#buildFetchHeaders(),
        body: JSON.stringify(payload),
        keepalive: true,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Merge custom headers but always set the configured `content-type`
   * (case-insensitively), so a raw `Content-Type` header in `headers` can't
   * accidentally break ingestion or diverge from the beacon's content-type.
   */
  #buildFetchHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.#headers)) {
      if (key.toLowerCase() !== 'content-type') headers[key] = value;
    }
    headers['content-type'] = this.#contentType;
    return headers;
  }

  #enqueue(payload: ConsentRecord): void {
    const queue = this.#readQueue();
    queue.push(payload);
    // Keep only the most recent N records.
    while (queue.length > this.#maxQueueSize) queue.shift();
    this.#writeQueue(queue);
  }

  #readQueue(): ConsentRecord[] {
    try {
      const raw = globalThis.localStorage?.getItem(this.#queueKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ConsentRecord[]) : [];
    } catch {
      return [];
    }
  }

  #writeQueue(queue: ConsentRecord[]): void {
    try {
      if (queue.length === 0) {
        globalThis.localStorage?.removeItem(this.#queueKey);
      } else {
        globalThis.localStorage?.setItem(this.#queueKey, JSON.stringify(queue));
      }
    } catch {
      /* storage unavailable — best effort, drop silently */
    }
  }

  #isOffline(): boolean {
    return globalThis.navigator?.onLine === false;
  }
}

/** Convenience factory mirroring the `create<Thing>()` style used elsewhere. */
export function createConsentLogger(options: ConsentLoggerOptions): ConsentLogger {
  return new ConsentLogger(options);
}
