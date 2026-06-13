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

  it('uses fetch (not beacon) when transport is "beacon" but headers are set', async () => {
    const beacon = vi.fn(() => true);
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('navigator', { sendBeacon: beacon, onLine: true });
    vi.stubGlobal('fetch', fetchMock);

    new ConsentLogger({
      endpoint: '/c',
      transport: 'beacon',
      headers: { 'x-api-key': 'k' },
    }).log(record);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(beacon).not.toHaveBeenCalled();
  });

  it('forces application/json even if the caller overrides content-type', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', fetchMock);

    new ConsentLogger({
      endpoint: '/c',
      headers: { 'Content-Type': 'text/plain', 'x-api-key': 'k' },
    }).log(record);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(headers['Content-Type']).toBeUndefined();
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

  it('stops flushing at the first failure and keeps the rest', async () => {
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([
        { ...record, subjectId: 'a' },
        { ...record, subjectId: 'b' },
      ])
    );
    vi.stubGlobal('navigator', { onLine: true });
    let call = 0;
    const fetchMock = vi.fn(async () => (++call === 1 ? okResponse() : failResponse()));
    vi.stubGlobal('fetch', fetchMock);

    new ConsentLogger({ endpoint: '/c' });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => {
      const queued = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
      expect(queued.map((r: ConsentRecord) => r.subjectId)).toEqual(['b']);
    });
  });

  it('preserves records enqueued while a flush is in flight', async () => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([{ ...record, subjectId: 'queued-1' }]));
    vi.stubGlobal('navigator', { onLine: true });

    // Simulate a new record being appended to the queue during the network await.
    const fetchMock = vi.fn(async () => {
      const q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
      if (!q.some((r: ConsentRecord) => r.subjectId === 'queued-2')) {
        q.push({ ...record, subjectId: 'queued-2' });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
      }
      return okResponse();
    });
    vi.stubGlobal('fetch', fetchMock);

    new ConsentLogger({ endpoint: '/c' });

    // The sent record ('queued-1') is dropped, but the one added mid-flush survives.
    await vi.waitFor(() => {
      const queued = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
      expect(queued.map((r: ConsentRecord) => r.subjectId)).toEqual(['queued-2']);
    });
  });
});
