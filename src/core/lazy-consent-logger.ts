import type { ConsentLogger as RealConsentLogger } from './consent-logger.js';
import type {
  ConsentConfigSnapshot,
  ConsentLoggerOptions,
  ConsentRecord,
} from './types.js';

type QueuedCall =
  | { kind: 'log'; record: ConsentRecord }
  | { kind: 'snapshot'; snapshot: ConsentConfigSnapshot };

/**
 * Lazily-loading stand-in for the real `ConsentLogger` (`./consent-logger.js`,
 * ~2.3 kB gzip). The implementation module is only fetched the first time a
 * `LazyConsentLogger` is actually constructed — i.e. only when
 * `KeksmeisterConfig.logging` is configured — instead of being bundled into
 * the main chunk unconditionally. Most consumers never enable server-side
 * logging and never pay for this code.
 *
 * `log()` / `logSnapshot()` can be called before the dynamic import resolves
 * (e.g. a consent decision made in the same tick as construction). Those
 * calls are queued and replayed, in order, once the real instance exists —
 * records are never silently dropped.
 *
 * This class is also the public `ConsentLogger` export from the package
 * root, so `import { ConsentLogger } from 'keksmeister'` and
 * `createConsentLogger(...)` stay lazy too. `keksmeister/core` (built via
 * `tsc`, not bundled) continues to export the real, eager class directly for
 * standalone/headless use.
 */
export class LazyConsentLogger {
  private real: RealConsentLogger | undefined;
  private readonly queue: QueuedCall[] = [];
  private readonly ready: Promise<void>;

  constructor(options: ConsentLoggerOptions) {
    this.ready = import('./consent-logger.js').then(({ ConsentLogger }) => {
      this.real = new ConsentLogger(options);
      this.drain();
    });
  }

  /** Send one consent record. Buffered until the logger module has loaded. */
  log(record: ConsentRecord): void {
    if (this.real) {
      this.real.log(record);
    } else {
      this.queue.push({ kind: 'log', record });
    }
  }

  /**
   * Upload a banner-config snapshot. Buffered until the logger module has
   * loaded.
   */
  logSnapshot(snapshot: ConsentConfigSnapshot): void {
    if (this.real) {
      this.real.logSnapshot(snapshot);
    } else {
      this.queue.push({ kind: 'snapshot', snapshot });
    }
  }

  /**
   * Attempt to resend any queued (offline) records. Waits for the logger
   * module to finish loading first.
   */
  async flush(): Promise<void> {
    await this.ready;
    await this.real?.flush();
  }

  /** Replay buffered calls, in order, once the real logger is available. */
  private drain(): void {
    const pending = this.queue.splice(0, this.queue.length);
    for (const call of pending) {
      if (call.kind === 'log') {
        this.real!.log(call.record);
      } else {
        this.real!.logSnapshot(call.snapshot);
      }
    }
  }
}

/** Convenience factory mirroring the `create<Thing>()` style used elsewhere. */
export function createConsentLogger(options: ConsentLoggerOptions): LazyConsentLogger {
  return new LazyConsentLogger(options);
}
