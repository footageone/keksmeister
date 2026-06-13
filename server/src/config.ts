/**
 * Runtime configuration, read from environment variables.
 *
 * All values have sensible defaults so the server starts with zero config.
 */

export type PartitionGranularity = 'day' | 'hour';

export interface Config {
  /** TCP port to listen on (PORT, default 8787). */
  port: number;
  /** Interface to bind (HOST, default 0.0.0.0). */
  host: string;
  /** Root directory for consent log files (DATA_DIR, default ./data). */
  dataDir: string;
  /** Path that accepts consent POSTs (INGEST_PATH, default /consent). */
  ingestPath: string;
  /**
   * Path that accepts banner-config snapshot POSTs (SNAPSHOT_PATH,
   * default `${INGEST_PATH}/snapshot`). Snapshots are stored idempotently
   * under `${dataDir}/revisions/` and provide the historical banner texts
   * required by DSK-OH Rn. 85.
   */
  snapshotPath: string;
  /**
   * Allowed CORS hosts (ALLOWED_HOSTS, comma-separated, default "*").
   *
   * Entries are bare hostnames without a scheme — both http and https origins
   * are accepted. Supports a leading `*.` wildcard for subdomains
   * (e.g. `*.footage.one` matches `app.footage.one` but not the apex
   * `footage.one`). `*` on its own allows every origin.
   */
  allowedHosts: string[];
  /** Max accepted request body size in bytes (MAX_BODY_BYTES, default 16384). */
  maxBodyBytes: number;
  /** Time bucket used for sub-directories (PARTITION, default "hour"). */
  partition: PartitionGranularity;
  /**
   * Optional salt. When set (HASH_IP_SALT), a pseudonymous SHA-256 hash of the
   * client IP is stored alongside each record. The raw IP is never persisted.
   */
  ipHashSalt: string | null;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Normalise an allow-list entry to a bare lowercase hostname, matching what
 * `new URL(origin).hostname` (minus brackets) yields: no scheme, no path, no
 * port, and no IPv6 brackets. So `https://localhost:5173/` and `[::1]:5173`
 * become `localhost` and `::1`.
 */
function normalizeHost(entry: string): string {
  let e = entry.trim().toLowerCase();
  if (e === '*') return e;
  // Strip an accidental scheme and any path.
  e = e.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/\/.*$/, '');
  if (e.startsWith('[')) {
    // IPv6 literal, optionally with a port: [::1] or [::1]:5173
    const end = e.indexOf(']');
    return end === -1 ? e : e.slice(1, end);
  }
  // Drop a trailing :port (a non-IPv6 host has no colons of its own).
  const colon = e.indexOf(':');
  return colon === -1 ? e : e.slice(0, colon);
}

export function loadConfig(
  env: Record<string, string | undefined> = process.env
): Config {
  const hosts = (env.ALLOWED_HOSTS ?? '*')
    .split(',')
    .map(normalizeHost)
    .filter(Boolean);

  let ingestPath = env.INGEST_PATH ?? '/consent';
  if (!ingestPath.startsWith('/')) ingestPath = `/${ingestPath}`;

  let snapshotPath = env.SNAPSHOT_PATH ?? `${ingestPath}/snapshot`;
  if (!snapshotPath.startsWith('/')) snapshotPath = `/${snapshotPath}`;

  return {
    port: positiveInt(env.PORT, 8787),
    host: env.HOST ?? '0.0.0.0',
    dataDir: env.DATA_DIR ?? './data',
    ingestPath,
    snapshotPath,
    allowedHosts: hosts.length > 0 ? hosts : ['*'],
    maxBodyBytes: positiveInt(env.MAX_BODY_BYTES, 16 * 1024),
    partition: env.PARTITION === 'day' ? 'day' : 'hour',
    ipHashSalt: env.HASH_IP_SALT ? env.HASH_IP_SALT : null,
  };
}
