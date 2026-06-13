import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentLogger } from './consent-logger.js';
import type { ConsentRecord } from './types.js';

const QUEUE_KEY = 'keksmeister_consent_queue';

const record: ConsentRecord = {
  timestamp: '2026-06-13T10:00:00.000Z',
  revision: '1',
  choices: { essential: true, analytics: true },
  method: 'accept-all',
  action: 'grant',
  subjectId: 'subj-1',
};

function okResponse() {
  return { ok: true } as Response;
}
function failResponse() {
  return { ok: false, status: 500 } as Response;
}

describe('ConsentLogger', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('prefers sendBeacon when available and no headers are set', () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon, onLine: true });

    new ConsentLogger({ endpoint: '/c' }).log(record);

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]![0]).toBe('/c');
  });

  it('falls back to fetch when sendBeacon is unavailable', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', fetchMock);

    new ConsentLogger({ endpoint: '/c' }).log(record);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const init = fetchMock.mock.calls[0]![1]!;
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
  });

  it('uses fetch (not beacon) and includes custom headers', async () => {
    const beacon = vi.fn(() => true);
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('navigator', { sendBeacon: beacon, onLine: true });
    vi.stubGlobal('fetch', fetchMock);

    new ConsentLogger({ endpoint: '/c', headers: { 'x-api-key': 'k' } }).log(record);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(beacon).not.toHaveBeenCalled();
    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('k');
  });

  it('attaches userAgent when includeUserAgent is set', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('navigator', { onLine: true, userAgent: 'TestUA/1.0' });
    vi.stubGlobal('fetch', fetchMock);

    new ConsentLogger({ endpoint: '/c', includeUserAgent: true }).log(record);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.userAgent).toBe('TestUA/1.0');
  });

  it('queues failed sends and resends them on the next construction', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', vi.fn(async () => failResponse()));

    new ConsentLogger({ endpoint: '/c' }).log(record);

    await vi.waitFor(() => {
      const queued = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
      expect(queued).toHaveLength(1);
    });

    // A fresh logger with a working endpoint should drain the queue.
    const fetchOk = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchOk);
    new ConsentLogger({ endpoint: '/c' });

    await vi.waitFor(() => expect(fetchOk).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(localStorage.getItem(QUEUE_KEY)).toBeNull());
  });

  it('does not flush the queue while offline', async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([record]));
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('navigator', { onLine: false });
    vi.stubGlobal('fetch', fetchMock);

    new ConsentLogger({ endpoint: '/c' });

    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(QUEUE_KEY)).not.toBeNull();
  });

  it('caps the offline queue at maxQueueSize', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', vi.fn(async () => failResponse()));

    const logger = new ConsentLogger({ endpoint: '/c', maxQueueSize: 2 });
    logger.log({ ...record, subjectId: 'a' });
    logger.log({ ...record, subjectId: 'b' });
    logger.log({ ...record, subjectId: 'c' });

    await vi.waitFor(() => {
      const queued = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
      expect(queued).toHaveLength(2);
      // Oldest ('a') dropped, newest kept.
      expect(queued.map((r: ConsentRecord) => r.subjectId)).toEqual(['b', 'c']);
    });
  });
});
