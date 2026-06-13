# @keksmeister/consent-log-server

A tiny, **database-free** consent logging server for [Keksmeister](../README.md).

Every consent decision (grant / update / revoke) is stored as its own plain JSON
file. There is no database, no migrations, and no state shared between requests —
so you can run as many instances behind a load balancer as you like, all writing
to the same volume without locking or collisions.

For a regulator export you simply ZIP up the data directory.

## Why this exists

DSGVO / TDDDG (2026) require you to **prove** consent: who consented, to what,
when, and to which banner version. The Keksmeister library produces a
`ConsentRecord` for every decision; this server is the smallest possible thing
that durably stores those records as legal proof.

## How records are stored

```
data/
  2026-06-13/          # day bucket
    14/                # hour bucket (keeps any single directory small)
      2026-06-13T14-03-09-123Z__b1f3...c9.json
      2026-06-13T14-03-11-880Z__7a02...4e.json
```

Each file is an envelope:

```json
{
  "id": "b1f3...c9",
  "receivedAt": "2026-06-13T14:03:09.201Z",
  "record": {
    "timestamp": "2026-06-13T14:03:09.123Z",
    "revision": "2",
    "action": "grant",
    "choices": { "essential": true, "analytics": true, "marketing": false },
    "method": "accept-all"
  }
}
```

- **Unique filename** (timestamp + UUID) → parallel-safe, no overwrites.
- **Time-bucketed directories** → no directory ever holds too many files.
- **`receivedAt`** is the server's own timestamp, independent of the client clock.

## Run it

```sh
cd server
bun install          # only dev types; the server itself has zero runtime deps
bun run start        # http://localhost:8787
bun run dev          # same, with --watch
bun test             # run the test suite
```

Send a consent record:

```sh
curl -X POST http://localhost:8787/consent \
  -H 'content-type: application/json' \
  -d '{"timestamp":"2026-06-13T14:03:09.123Z","revision":"2","action":"grant","choices":{"analytics":true}}'
# -> {"id":"..."}
```

## Configuration

All via environment variables — every one has a default:

| Variable          | Default     | Description |
|-------------------|-------------|-------------|
| `PORT`            | `8787`      | Listen port |
| `HOST`            | `0.0.0.0`   | Bind address |
| `DATA_DIR`        | `./data`    | Where log files are written |
| `INGEST_PATH`     | `/consent`  | Path that accepts `POST`s |
| `ALLOWED_HOSTS`   | `*`         | Comma-separated CORS allow-list of **bare hostnames** (no scheme; http + https both match). Supports a leading `*.` for subdomains, e.g. `footage.one,*.footage.one`. `*` allows any origin. |
| `MAX_BODY_BYTES`  | `16384`     | Reject larger request bodies |
| `PARTITION`       | `hour`      | Directory bucket size: `hour` or `day` |
| `HASH_IP_SALT`    | _(unset)_   | If set, store a SHA-256 hash of the client IP (the raw IP is **never** stored) |

## Wire it to the banner

Use Keksmeister's built-in `logging` option — it sends every decision (grant,
update **and** revoke) via `sendBeacon` with an offline retry queue, so records
survive the navigation after "Accept all":

```js
banner.config = {
  // ...categories, privacyUrl, revision...
  logging: {
    endpoint: 'https://consent.example.com/consent',
  },
};
```

Prefer to own the transport yourself? The `onConsent` callback still works
(grant/update only):

```js
onConsent: (record) => {
  const url = 'https://consent.example.com/consent';
  const body = JSON.stringify(record);
  if (!navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))) {
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
  }
},
```

> Set `ALLOWED_HOSTS` to your site's hostname(s) so only your pages can post,
> e.g. `footage.one,*.footage.one`.

## Docker

```sh
# Build
docker build -t keksmeister-consent-log ./server

# Run with a named volume for the logs
docker run -d --name consent-log \
  -p 8787:8787 \
  -e ALLOWED_HOSTS="example.com,*.example.com" \
  -v consent-data:/data \
  keksmeister-consent-log
```

Or with Compose:

```sh
cd server
docker compose up -d
```

## Regulator export

Bundle every log file into one ZIP:

```sh
DATA_DIR=./data sh scripts/export.sh
# -> Wrote /…/consent-export-20260613T144501Z.zip
```

From a running container:

```sh
docker exec consent-log sh -c 'cd /data && zip -r - .' > consent-export.zip
```

## Compliance notes (operational, not enforced by code)

- **EU hosting** — deploy this container in an EU region; consent proof should
  not leave the EU.
- **Retention ≥ 3 years** — keep the `data/` volume (and your backups) for at
  least three years; prune older buckets after that.
- **Pseudonymity** — the raw IP is never written. Enable `HASH_IP_SALT` only if
  you need a pseudonymous correlation handle, and keep the salt secret.
- **Backups** — the data directory is your single source of truth; back it up.
