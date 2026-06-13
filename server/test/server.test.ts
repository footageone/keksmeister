import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../src/config.ts';
import { createHandler } from '../src/server.ts';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'consent-srv-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function handler(env: Record<string, string | undefined> = {}) {
  return createHandler(loadConfig({ DATA_DIR: dir, ...env }));
}

async function storedFiles(): Promise<string[]> {
  return Array.fromAsync(new Bun.Glob('**/*.json').scan({ cwd: dir }));
}

test('GET /health returns ok', async () => {
  const res = await handler()(new Request('http://x/health'));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok' });
});

test('OPTIONS preflight returns 204 with CORS headers', async () => {
  const res = await handler()(
    new Request('http://x/consent', {
      method: 'OPTIONS',
      headers: { origin: 'https://site.example' },
    })
  );
  expect(res.status).toBe(204);
  expect(res.headers.get('access-control-allow-origin')).toBe('*');
  expect(res.headers.get('access-control-allow-methods')).toContain('POST');
});

test('POST stores a record and returns its id', async () => {
  const body = JSON.stringify({
    timestamp: '2026-06-13T14:00:00.000Z',
    revision: '2',
    action: 'grant',
    choices: { analytics: true },
  });
  const res = await handler()(
    new Request('http://x/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })
  );
  expect(res.status).toBe(201);
  const out = (await res.json()) as { id: string };
  expect(typeof out.id).toBe('string');
  expect(await storedFiles()).toHaveLength(1);
});

test('POST with invalid JSON returns 400 and writes nothing', async () => {
  const res = await handler()(
    new Request('http://x/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    })
  );
  expect(res.status).toBe(400);
  expect(await storedFiles()).toHaveLength(0);
});

test('POST with a non-object body returns 400', async () => {
  const res = await handler()(
    new Request('http://x/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '"just a string"',
    })
  );
  expect(res.status).toBe(400);
});

test('oversized payload returns 413', async () => {
  const res = await handler({ MAX_BODY_BYTES: '10' })(
    new Request('http://x/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 'xxxxxxxxxxxxxxxxxxxx' }),
    })
  );
  expect(res.status).toBe(413);
});

test('unknown route returns 404', async () => {
  const res = await handler()(new Request('http://x/nope'));
  expect(res.status).toBe(404);
});

test('ipHash is stored only when a salt is configured', async () => {
  const res = await handler({ HASH_IP_SALT: 's3cr3t' })(
    new Request('http://x/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"action":"grant"}',
    }),
    '203.0.113.5'
  );
  expect(res.status).toBe(201);

  const files = await storedFiles();
  expect(files).toHaveLength(1);
  const content = await Bun.file(join(dir, files[0]!)).json();
  expect(typeof content.ipHash).toBe('string');
  expect(content.record).toEqual({ action: 'grant' });
});

test('no ipHash when no salt configured', async () => {
  await handler()(
    new Request('http://x/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"action":"grant"}',
    }),
    '203.0.113.5'
  );
  const files = await storedFiles();
  const content = await Bun.file(join(dir, files[0]!)).json();
  expect(content.ipHash).toBeUndefined();
});

test('custom ingest path is honoured', async () => {
  const res = await handler({ INGEST_PATH: '/api/consent' })(
    new Request('http://x/api/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"action":"grant"}',
    })
  );
  expect(res.status).toBe(201);
});

function preflight(h: ReturnType<typeof handler>, origin: string, requestHeaders?: string) {
  const headers: Record<string, string> = { origin };
  if (requestHeaders) headers['access-control-request-headers'] = requestHeaders;
  return h(new Request('http://x/consent', { method: 'OPTIONS', headers }));
}

test('CORS: wildcard subdomain host is echoed for both http and https', async () => {
  const h = handler({ ALLOWED_HOSTS: '*.footage.one' });
  for (const origin of ['https://app.footage.one', 'http://app.footage.one']) {
    const res = await preflight(h, origin);
    expect(res.headers.get('access-control-allow-origin')).toBe(origin);
  }
});

test('CORS: wildcard does not match the apex or a foreign host', async () => {
  const h = handler({ ALLOWED_HOSTS: '*.footage.one' });
  for (const origin of [
    'https://footage.one',
    'https://evil-footage.one',
    'https://footage.one.evil.com',
  ]) {
    const res = await preflight(h, origin);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  }
});

test('CORS: exact host matches regardless of scheme but not subdomains', async () => {
  const h = handler({ ALLOWED_HOSTS: 'footage.one' });
  const ok = await preflight(h, 'http://footage.one');
  expect(ok.headers.get('access-control-allow-origin')).toBe('http://footage.one');
  const sub = await preflight(h, 'https://app.footage.one');
  expect(sub.headers.get('access-control-allow-origin')).toBeNull();
});

test('CORS: accidental scheme in ALLOWED_HOSTS is tolerated', async () => {
  const h = handler({ ALLOWED_HOSTS: 'https://footage.one, *.example.com' });
  const res = await preflight(h, 'https://footage.one');
  expect(res.headers.get('access-control-allow-origin')).toBe('https://footage.one');
  const res2 = await preflight(h, 'https://a.example.com');
  expect(res2.headers.get('access-control-allow-origin')).toBe('https://a.example.com');
});

test('CORS: preflight echoes requested headers', async () => {
  const res = await preflight(handler(), 'https://x.example', 'x-api-key, content-type');
  expect(res.headers.get('access-control-allow-headers')).toBe('x-api-key, content-type');
});
