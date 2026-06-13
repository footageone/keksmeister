# Minimal image for the Keksmeister consent log server.
# The server has no runtime dependencies — just Bun and the source.
FROM oven/bun:1.3-alpine@sha256:5acc90a93e91ff07bf72aa90a7c9f0fa189765aec90b47bdbf2152d2196383c0

WORKDIR /app

# Source only; no `bun install` needed (zero runtime deps).
COPY package.json ./
COPY src ./src

# Consent logs live on a mounted volume so they survive container restarts.
ENV DATA_DIR=/data \
    PORT=8787 \
    HOST=0.0.0.0
RUN mkdir -p /data && chown -R bun:bun /data
VOLUME ["/data"]

EXPOSE 8787
USER bun

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "src/index.ts"]
