/**
 * Entry point. Wires the request handler into Bun's HTTP server.
 */

import { loadConfig } from './config.ts';
import { createHandler } from './server.ts';

const config = loadConfig();
const handle = createHandler(config);

const server = Bun.serve({
  port: config.port,
  hostname: config.host,
  // Reject oversized bodies at the server boundary (Bun returns 413 before the
  // handler runs), so a body without a Content-Length can't be buffered into
  // memory. A small headroom is added for the JSON envelope overhead.
  maxRequestBodySize: config.maxBodyBytes + 1024,
  fetch(req, srv) {
    const ip = srv.requestIP(req)?.address;
    return handle(req, ip);
  },
});

console.log(
  `[consent-log] listening on http://${server.hostname}:${server.port} ` +
    `(ingest: POST ${config.ingestPath}, data: ${config.dataDir}, partition: ${config.partition})`
);
