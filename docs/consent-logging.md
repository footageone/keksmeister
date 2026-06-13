# Consent Proof & Server-Side Logging

DSGVO / TDDDG require you to **prove** consent — who consented, to what, when,
and against which banner version. Keksmeister produces an audit-ready record for
every decision and can ship it to your backend for you.

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
| `endpoint`         | _(required)_                 | URL that receives records via HTTP `POST` (`application/json`) |
| `transport`        | `auto`                       | `auto` (beacon, then fetch), `beacon`, or `fetch` |
| `headers`          | `{}`                         | Extra headers — **forces `fetch`** (beacons cannot set headers) |
| `includeUserAgent` | `false`                      | Attach `navigator.userAgent` to each sent record |
| `queueKey`         | `keksmeister_consent_queue`  | `localStorage` key for the offline retry queue |
| `maxQueueSize`     | `50`                         | Max records buffered while offline |

#### Why it's reliable

- **`navigator.sendBeacon` first** — the record survives the page navigation that
  often follows "Accept all". Falls back to `fetch(…, { keepalive: true })`.
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

### Regulator export

```sh
DATA_DIR=./data sh server/scripts/export.sh
# -> consent-export-20260613T144501Z.zip
```

## Compliance notes (operational, not enforced by code)

- **EU hosting** — run the server in an EU region; consent proof should not leave the EU.
- **Retention ≥ 3 years** — keep the data volume (and backups) for at least three years.
- **Pseudonymity** — the raw client IP is **never** stored. The server can store a
  salted SHA-256 hash instead via `HASH_IP_SALT` if you need a correlation handle.
- **Backups** — the data directory is your single source of truth; back it up.
