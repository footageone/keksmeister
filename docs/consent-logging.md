# Consent Proof & Server-Side Logging

**§ 25 TDDDG** (in force since May 2024, replacing TTDSG) and **DSGVO Art. 7**
require you to **prove** consent — who consented, to what, when, and against
which banner version. Keksmeister produces an audit-ready record for every
decision and can ship it to your backend for you. For the full mapping of
library features to legal requirements (including the **EinwV / § 26 TDDDG**
boundary — Keksmeister is not an anerkannter Einwilligungsverwaltungsdienst),
see [compliance.md](compliance.md).

## What a consent record contains

Every decision produces a `ConsentRecord`:

```jsonc
{
  "timestamp": "2026-06-13T14:03:09.123Z", // ISO 8601, when the decision was made
  "revision": "2",                          // banner/config version in effect
  "choices": { "essential": true, "analytics": true, "marketing": false },
  "method": "accept-all",                   // accept-all | reject-all | custom | revoke
  "action": "grant",                        // grant | update | revoke
  "subjectId": "b1f3…c9",                   // pseudonymous, per-browser, persisted
  "userAgent": "Mozilla/5.0 …"              // only when logging.includeUserAgent is on
}
```

Key fields for proof:

- **`timestamp` + `revision`** — when, and against which banner version.
- **`subjectId`** — a pseudonymous, stable per-browser id, persisted in the consent
  cookie. It ties a visitor's decisions (grant → update → revoke) together **without
  storing any personal data**. It is generated automatically and survives a
  `revision` bump on the same browser.
- **`action`** — distinguishes the first `grant` from a later `update`, and marks a
  `revoke`. (`method` describes *how* the choice was made.)

> A revocation is a first-class record (`action: "revoke"`), so withdrawals are part
> of your audit trail — not just the original opt-in.

## Two ways to log

### 1. `onConsent` callback (you own the transport)

Full control. Fires on **grant/update** (not on revoke, so the common
`onConsent → enable tracking` pattern stays correct):

```js
banner.config = {
  // …categories, privacyUrl, revision…
  onConsent: (record) => {
    fetch('/api/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(record),
    });
  },
};
```

### 2. Built-in logger (`logging`) — recommended

Set an endpoint and Keksmeister sends **every** decision, including
**revocations**, with reliable delivery:

```js
banner.config = {
  // …categories, privacyUrl, revision…
  logging: {
    endpoint: 'https://consent.example.com/consent',
  },
};
```

The built-in logger is independent of `onConsent` — you can use both.

#### `logging` options

| Option             | Default                      | Description |
|--------------------|------------------------------|-------------|
| `endpoint`         | _(required)_                 | URL that receives records via HTTP `POST` |
| `transport`        | `auto`                       | `auto` (beacon, then fetch), `beacon`, or `fetch` |
| `contentType`      | `text/plain;charset=UTF-8`   | Wire content-type for beacon **and** fetch. Default is CORS-safelisted (see below) |
| `headers`          | `{}`                         | Extra headers — **forces `fetch`** (beacons cannot set headers) |
| `includeUserAgent` | `false`                      | Attach `navigator.userAgent` to each sent record |
| `queueKey`         | `keksmeister_consent_queue`  | `localStorage` key for the offline retry queue |
| `maxQueueSize`     | `50`                         | Max records buffered while offline |
| `snapshotEndpoint` | `${endpoint}/snapshot`       | URL that receives banner-config snapshots (see below) |
| `snapshotSentKeyPrefix` | `keksmeister_snapshot_sent_` | `localStorage` key prefix for per-revision dedup |

#### Banner-config snapshots (historical proof — DSK-OH Rn. 85)

Recording *only* the revision string is not enough: a regulator needs to see the
**actual texts and categories** the visitor saw at the time of consent. Keksmeister
uploads a snapshot of the current banner configuration to `${endpoint}/snapshot`
once per revision (deduped via `localStorage` and again server-side by content
hash):

```jsonc
{
  "revision": "2",
  "capturedAt": "2026-06-13T14:00:00.000Z",
  "categories": [/* id, label, description, services… */],
  "privacyUrl": "https://example.com/privacy",
  "imprintUrl": "https://example.com/imprint",
  "lang": "de",
  "translations": { "banner": { "acceptAll": "Alle akzeptieren", … }, … }
}
```

The included server stores snapshots under `data/revisions/<revision>__<hash>.json`.
Identical snapshots are written once; a new content hash means the banner texts
or categories changed without a revision bump (operator bug — but the snapshot
still gets recorded).

#### Why it's reliable

- **`navigator.sendBeacon` first** — the record survives the page navigation that
  often follows "Accept all". Falls back to `fetch(…, { keepalive: true })`.
- **Cross-origin safe by default** — the beacon body uses a CORS-safelisted
  content-type (`text/plain;charset=UTF-8`), making it a "simple request" that
  reaches a cross-origin endpoint with **no preflight and regardless of server
  CORS**. The included server parses the body as JSON whatever the content-type.
  If you point `endpoint` at a third-party endpoint that requires
  `application/json`, set `contentType: 'application/json'`; `auto` then uses
  `fetch` for cross-origin endpoints (a cross-origin JSON beacon would be
  silently dropped), so that endpoint must allow CORS for the `POST`.
- **Offline retry queue** — failed sends are buffered in `localStorage` and retried
  on the next page load (and after the next successful send). The queue is drained
  oldest-first and stops at the first failure, so a record is never silently dropped
  while a flush is in flight.

## The included logging server

A minimal, **database-free** server lives in [`server/`](../server/README.md). It
stores each record as its own plain JSON file — so multiple instances can write to a
shared volume in parallel, and a regulator export is just a ZIP of the folder.

```sh
cd server
bun run start          # http://localhost:8787  (POST /consent)
# or run the pre-built multi-arch image:
docker run -d -p 8787:8787 -v consent-data:/data \
  ghcr.io/footageone/keksmeister-consent-log:latest
```

Point the banner at it:

```js
logging: { endpoint: 'https://consent.example.com/consent' }
```

### CORS allow-list (`ALLOWED_HOSTS`)

Restrict which sites may post. Entries are **bare hostnames** (no scheme — both
`http` and `https` match) and support a leading `*.` wildcard for subdomains:

```sh
# matches footage.one and any subdomain (app.footage.one, www.footage.one),
# but NOT the apex via the wildcard alone — list it explicitly if needed.
ALLOWED_HOSTS="footage.one,*.footage.one"
```

`*` (the default) allows any origin — fine for local testing, lock it down in prod.

### Snapshot endpoint (`SNAPSHOT_PATH`)

The server accepts banner-config snapshots at `${INGEST_PATH}/snapshot` by
default. Override via `SNAPSHOT_PATH=/api/banner-snapshot`. Snapshots land under
`data/revisions/` and are deduped on content hash, so re-uploads from many
visitors collapse to one file per (revision, content) pair.

### Regulator export

```sh
DATA_DIR=./data sh server/scripts/export.sh
# -> consent-export-20260613T144501Z.zip
```

## Compliance notes (operational, not enforced by code)

- **EU hosting** — run the server in an EU region; consent proof should not leave the EU.
- **Retention ≈ 3 years** — the German civil limitation period (§§ 195, 199 BGB)
  is three years, so consent proof needs to survive at least that long. After
  the window expires, *delete* — keeping it longer violates the storage
  limitation principle (Art. 5(1)(e) DSGVO). Use `server/scripts/prune.sh`
  (default `RETENTION_DAYS=1095`) from cron to do this automatically.
- **Pseudonymity** — the raw client IP is **never** stored. The server can store a
  salted SHA-256 hash instead via `HASH_IP_SALT` if you need a correlation handle.
- **Backups** — the data directory is your single source of truth; back it up.
