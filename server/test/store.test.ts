import { describe, expect, test } from 'bun:test';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  entryFilename,
  partitionSegments,
  writeEnvelope,
  writeSnapshot,
} from '../src/store.ts';

describe('partitionSegments', () => {
  const date = new Date('2026-06-13T14:03:09.123Z');

  test('hourly buckets by day and hour', () => {
    expect(partitionSegments(date, 'hour')).toEqual(['2026-06-13', '14']);
  });

  test('daily buckets by day only', () => {
    expect(partitionSegments(date, 'day')).toEqual(['2026-06-13']);
  });
});

test('entryFilename is filesystem-safe and lexically sortable', () => {
  const name = entryFilename(new Date('2026-06-13T14:03:09.123Z'), 'abc');
  expect(name).toBe('2026-06-13T14-03-09-123Z__abc.json');
  expect(name).not.toContain(':');
});

test('writeEnvelope writes a JSON file into the partition directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'consent-store-'));
  try {
    const now = new Date('2026-06-13T14:03:09.123Z');
    const path = await writeEnvelope(
      dir,
      'hour',
      {
        id: 'id1',
        receivedAt: now.toISOString(),
        record: { choices: { analytics: true } },
      },
      now
    );

    expect(path).toContain(join('2026-06-13', '14'));

    const content = JSON.parse(await readFile(path, 'utf8'));
    expect(content.id).toBe('id1');
    expect(content.record.choices.analytics).toBe(true);

    const files = await readdir(join(dir, '2026-06-13', '14'));
    expect(files).toHaveLength(1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('two writes in the same bucket never collide', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'consent-store-'));
  try {
    const now = new Date('2026-06-13T14:03:09.123Z');
    await writeEnvelope(dir, 'hour', { id: 'a', receivedAt: now.toISOString(), record: {} }, now);
    await writeEnvelope(dir, 'hour', { id: 'b', receivedAt: now.toISOString(), record: {} }, now);
    const files = await readdir(join(dir, '2026-06-13', '14'));
    expect(files).toHaveLength(2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

describe('writeSnapshot', () => {
  test('writes a snapshot under revisions/ and reports existed=false', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'consent-snap-'));
    try {
      const snapshot = {
        revision: '2',
        capturedAt: '2026-06-13T14:00:00.000Z',
        categories: [{ id: 'analytics', label: 'Analytics' }],
        privacyUrl: '/privacy',
      };
      const { path, existed } = await writeSnapshot(dir, snapshot);
      expect(existed).toBe(false);
      expect(path).toContain('revisions');
      expect(path).toContain('2__');

      const content = JSON.parse(await readFile(path, 'utf8'));
      expect(content.revision).toBe('2');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('is idempotent for identical content (capturedAt ignored)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'consent-snap-'));
    try {
      const base = {
        revision: '2',
        categories: [{ id: 'analytics', label: 'Analytics' }],
        privacyUrl: '/privacy',
      };
      const first = await writeSnapshot(dir, { ...base, capturedAt: 'A' });
      const second = await writeSnapshot(dir, { ...base, capturedAt: 'B' });
      expect(first.path).toBe(second.path);
      expect(second.existed).toBe(true);

      const files = await readdir(join(dir, 'revisions'));
      expect(files).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('different content yields a different file even at the same revision', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'consent-snap-'));
    try {
      const a = await writeSnapshot(dir, {
        revision: '2',
        categories: [{ id: 'analytics', label: 'Analytics' }],
        privacyUrl: '/privacy',
      });
      const b = await writeSnapshot(dir, {
        revision: '2',
        categories: [{ id: 'analytics', label: 'Analyse' }],
        privacyUrl: '/privacy',
      });
      expect(a.path).not.toBe(b.path);
      const files = await readdir(join(dir, 'revisions'));
      expect(files).toHaveLength(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('sanitises unsafe characters in the revision name', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'consent-snap-'));
    try {
      const { path } = await writeSnapshot(dir, {
        revision: '../etc/passwd',
        categories: [],
        privacyUrl: '/p',
      });
      expect(path).not.toContain('..');
      expect(path).not.toContain('/etc/');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('rejects null, arrays and primitives with a TypeError', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'consent-snap-'));
    try {
      await expect(writeSnapshot(dir, null)).rejects.toBeInstanceOf(TypeError);
      await expect(writeSnapshot(dir, [])).rejects.toBeInstanceOf(TypeError);
      await expect(writeSnapshot(dir, 'oops')).rejects.toBeInstanceOf(TypeError);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
