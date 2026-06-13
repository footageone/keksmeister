/**
 * File-based consent log storage.
 *
 * Each consent event is written to its own JSON file. Because every file has a
 * unique name (timestamp + UUID), multiple server instances can write to the
 * same volume in parallel without coordination or locking. Files are bucketed
 * into time-based sub-directories so no single directory grows without bound.
 */

import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { PartitionGranularity } from './config.ts';

const REVISIONS_DIR = 'revisions';

export interface StoredEnvelope {
  /** Server-assigned unique id for this log entry (also used in the filename). */
  id: string;
  /** When the server received the event (ISO 8601, UTC). */
  receivedAt: string;
  /** Pseudonymous IP hash — only present when HASH_IP_SALT is configured. */
  ipHash?: string;
  /** The consent record exactly as sent by the client. */
  record: unknown;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Directory segments for a given instant.
 * - "day"  -> ["2026-06-13"]
 * - "hour" -> ["2026-06-13", "14"]
 */
export function partitionSegments(
  date: Date,
  partition: PartitionGranularity
): string[] {
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
  return partition === 'day' ? [day] : [day, pad(date.getUTCHours())];
}

/** Filesystem-safe, lexically sortable filename for an entry. */
export function entryFilename(date: Date, id: string): string {
  // 2026-06-13T14:03:09.123Z -> 2026-06-13T14-03-09-123Z
  const ts = date.toISOString().replace(/[:.]/g, '-');
  return `${ts}__${id}.json`;
}

/**
 * Persist one envelope. Returns the absolute-ish path it was written to.
 * `now` is injectable for testing; it determines the partition directory.
 */
export async function writeEnvelope(
  dataDir: string,
  partition: PartitionGranularity,
  envelope: StoredEnvelope,
  now: Date = new Date()
): Promise<string> {
  const dir = join(dataDir, ...partitionSegments(now, partition));
  await mkdir(dir, { recursive: true });
  const path = join(dir, entryFilename(now, envelope.id));
  await Bun.write(path, JSON.stringify(envelope, null, 2));
  return path;
}

/**
 * Replace any character that isn't safe in a path segment. Keeps letters,
 * digits, dot, dash and underscore; collapses everything else to `-`. Strips
 * leading dots so a malicious revision string can't produce `.` / `..`
 * filenames.
 */
function safeRevisionSegment(revision: string): string {
  const cleaned = revision
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 64);
  return cleaned || 'revision';
}

/**
 * Persist a banner-config snapshot under `${dataDir}/revisions/`. Idempotent:
 * the filename embeds a content hash, so identical snapshots overwrite
 * themselves rather than accumulating. Returns the path and whether the file
 * already existed.
 */
export async function writeSnapshot(
  dataDir: string,
  snapshot: unknown
): Promise<{ path: string; existed: boolean }> {
  const revision =
    snapshot && typeof snapshot === 'object' && 'revision' in snapshot
      ? String((snapshot as { revision: unknown }).revision)
      : 'unknown';

  // Hash the snapshot body without `capturedAt`, which changes per page load
  // but does not signal a real config change.
  const fingerprint = { ...(snapshot as Record<string, unknown>) };
  delete fingerprint.capturedAt;
  const hash = createHash('sha256')
    .update(JSON.stringify(fingerprint))
    .digest('hex')
    .slice(0, 16);

  const dir = join(dataDir, REVISIONS_DIR);
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${safeRevisionSegment(revision)}__${hash}.json`);

  const existed = await Bun.file(path).exists();
  if (!existed) {
    await Bun.write(path, JSON.stringify(snapshot, null, 2));
  }
  return { path, existed };
}
