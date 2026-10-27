import { describe, expect, it, vi } from 'vitest';
import { createConsentLogger, LazyConsentLogger } from './lazy-consent-logger.js';
import type { ConsentRecord } from './types.js';

function makeRecord(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    timestamp: new Date().toISOString(),
    revision: '1',
    choices: { analytics: true },
    method: 'accept-all',
    action: 'grant',
    ...overrides,
  };
}

describe('LazyConsentLogger', () => {
  it('does not send anything before the logger module has loaded', async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon, onLine: true });

    const logger = new LazyConsentLogger({ endpoint: '/api/consent' });
    logger.log(makeRecord());

    // The dynamic import always resolves asynchronously, even when the
    // module is already cached, so nothing can have been sent yet.
    expect(beacon).not.toHaveBeenCalled();

    // Let the pending import settle before this test ends so its delivery
    // doesn't leak into (and get counted by) a later test's mocks.
    await vi.dynamicImportSettled();

    vi.unstubAllGlobals();
  });

  it('buffers calls made before construction settles and replays them in order once it does', async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon, onLine: true });

    const logger = new LazyConsentLogger({ endpoint: '/api/consent' });
    // Both calls land before the dynamic import resolves.
    const first = makeRecord({ action: 'grant' });
    const second = makeRecord({ action: 'update' });
    logger.log(first);
    logger.log(second);

    await vi.dynamicImportSettled();

    expect(beacon).toHaveBeenCalledTimes(2);
    const body1 = JSON.parse(await (beacon.mock.calls[0]![1] as Blob).text());
    const body2 = JSON.parse(await (beacon.mock.calls[1]![1] as Blob).text());
    expect(body1.action).toBe('grant');
    expect(body2.action).toBe('update');

    vi.unstubAllGlobals();
  });

  it('buffers a logSnapshot() call made before construction settles', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();

    const logger = new LazyConsentLogger({ endpoint: '/c' });
    logger.logSnapshot({
      revision: '9',
      capturedAt: new Date().toISOString(),
      categories: [],
      privacyUrl: '/p',
    });

    expect(fetchMock).not.toHaveBeenCalled();

    await vi.dynamicImportSettled();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]![0]).toBe('/c/snapshot');

    vi.unstubAllGlobals();
  });

  it('createConsentLogger() returns a LazyConsentLogger instance', () => {
    const logger = createConsentLogger({ endpoint: '/api/consent' });
    expect(logger).toBeInstanceOf(LazyConsentLogger);
  });

  it('flush() waits for the module to load before delegating', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const logger = new LazyConsentLogger({ endpoint: '/api/consent' });
    await expect(logger.flush()).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});
