FROM oven/bun
WORKDIR /app
ENV NODE_ENV=production

COPY bun.lock .
COPY package.json .

RUN bun install --frozen-lockfile

COPY ./ ./

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["bun", "-e", "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["bun", "main.ts"]
