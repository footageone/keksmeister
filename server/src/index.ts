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
  fetch(req, srv) {
    const ip = srv.requestIP(req)?.address;
    return handle(req, ip);
  },
});

console.log(
  `[consent-log] listening on http://${server.hostname}:${server.port} ` +
    `(ingest: POST ${config.ingestPath}, data: ${config.dataDir}, partition: ${config.partition})`
);
