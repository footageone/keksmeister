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
  /** Allowed CORS origins (ALLOWED_ORIGINS, comma-separated, default "*"). */
  allowedOrigins: string[];
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

export function loadConfig(
  env: Record<string, string | undefined> = process.env
): Config {
  const origins = (env.ALLOWED_ORIGINS ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  let ingestPath = env.INGEST_PATH ?? '/consent';
  if (!ingestPath.startsWith('/')) ingestPath = `/${ingestPath}`;

  return {
    port: positiveInt(env.PORT, 8787),
    host: env.HOST ?? '0.0.0.0',
    dataDir: env.DATA_DIR ?? './data',
    ingestPath,
    allowedOrigins: origins.length > 0 ? origins : ['*'],
    maxBodyBytes: positiveInt(env.MAX_BODY_BYTES, 16 * 1024),
    partition: env.PARTITION === 'day' ? 'day' : 'hour',
    ipHashSalt: env.HASH_IP_SALT ? env.HASH_IP_SALT : null,
  };
}
