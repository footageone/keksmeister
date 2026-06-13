/**
 * Request handling for the consent log server.
 *
 * `createHandler` returns a framework-free async function `(req, ip?) => Response`
 * so it can be driven by `Bun.serve` in production and called directly in tests.
 */

import { createHash, randomUUID } from 'node:crypto';
import type { Config } from './config.ts';
import { writeEnvelope, type StoredEnvelope } from './store.ts';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

/** Build CORS headers for a given request origin. */
export function corsHeaders(
  config: Config,
  origin: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };

  if (config.allowedOrigins.includes('*')) {
    headers['access-control-allow-origin'] = '*';
  } else if (origin && config.allowedOrigins.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }

  return headers;
}

function json(
  body: unknown,
  status: number,
  extra: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });
}

export function createHandler(config: Config) {
  return async function handle(req: Request, ip?: string): Promise<Response> {
    const url = new URL(req.url);
    const cors = corsHeaders(config, req.headers.get('origin'));

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Health / readiness probe
    if (req.method === 'GET' && url.pathname === '/health') {
      return json({ status: 'ok' }, 200, cors);
    }

    // Consent ingest
    if (req.method === 'POST' && url.pathname === config.ingestPath) {
      const declared = Number(req.headers.get('content-length') ?? '0');
      if (Number.isFinite(declared) && declared > config.maxBodyBytes) {
        return json({ error: 'payload too large' }, 413, cors);
      }

      const text = await req.text();
      if (Buffer.byteLength(text, 'utf8') > config.maxBodyBytes) {
        return json({ error: 'payload too large' }, 413, cors);
      }

      let record: unknown;
      try {
        record = JSON.parse(text);
      } catch {
        return json({ error: 'invalid json' }, 400, cors);
      }

      if (record === null || typeof record !== 'object' || Array.isArray(record)) {
        return json({ error: 'expected a consent record object' }, 400, cors);
      }

      const now = new Date();
      const envelope: StoredEnvelope = {
        id: randomUUID(),
        receivedAt: now.toISOString(),
        record,
      };
      if (config.ipHashSalt && ip) {
        envelope.ipHash = createHash('sha256')
          .update(`${config.ipHashSalt}:${ip}`)
          .digest('hex');
      }

      try {
        await writeEnvelope(config.dataDir, config.partition, envelope, now);
      } catch (err) {
        console.error('[consent-log] write failed:', err);
        return json({ error: 'storage error' }, 500, cors);
      }

      return json({ id: envelope.id }, 201, cors);
    }

    return json({ error: 'not found' }, 404, cors);
  };
}
