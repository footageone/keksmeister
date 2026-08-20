# Minimal image for the Keksmeister consent log server.
# The server has no runtime dependencies — just Bun and the source.
FROM oven/bun:1.4-alpine@sha256:07235578f79ef8c6f97d94aee7938e76f5cdba5f21ae5dbfdd3d3d38058437eb

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
