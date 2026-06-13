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

/**
 * Match a request's Origin against a bare hostname pattern.
 * Patterns are hostnames without a scheme; both http and https are accepted.
 * A leading `*.` matches any subdomain but not the apex domain.
 */
function hostMatches(pattern: string, host: string): boolean {
  if (pattern === '*') return true;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // ".footage.one"
    return host.endsWith(suffix) && host.length > suffix.length;
  }
  return pattern === host;
}

/** Whether an Origin header value is permitted by the allow-list. */
export function isAllowedOrigin(origin: string, allowedHosts: string[]): boolean {
  if (allowedHosts.includes('*')) return true;
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  // URL().hostname keeps IPv6 brackets ([::1]); drop them to match normalised entries.
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  if (!host) return false;
  return allowedHosts.some((pattern) => hostMatches(pattern, host));
}

/** Build CORS headers for a request. */
export function corsHeaders(
  config: Config,
  req: Request
): Record<string, string> {
  const origin = req.headers.get('origin');
  // Echo the headers the browser announced in the preflight so clients can use
  // custom headers (e.g. an API key via ConsentLoggerOptions.headers). Falls
  // back to content-type for the common case.
  const requestedHeaders = req.headers.get('access-control-request-headers');

  const headers: Record<string, string> = {
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': requestedHeaders ?? 'content-type',
    'access-control-max-age': '86400',
  };

  if (config.allowedHosts.includes('*')) {
    headers['access-control-allow-origin'] = '*';
  } else if (origin && isAllowedOrigin(origin, config.allowedHosts)) {
    // Echo the exact origin back, so the matched host works over both schemes.
    headers['access-control-allow-origin'] = origin;
  }

  // Responses vary by these request headers, so caches must key on them.
  const vary = ['Origin'];
  if (requestedHeaders) vary.push('Access-Control-Request-Headers');
  headers['vary'] = vary.join(', ');

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
    const cors = corsHeaders(config, req);

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
      // Primary protection against large bodies is Bun.serve's
      // `maxRequestBodySize` (see index.ts), which rejects before we get here.
      // This Content-Length check is a fast, transport-agnostic early-out.
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
