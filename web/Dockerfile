FROM oven/bun
WORKDIR /app
ENV NODE_ENV=production

COPY bun.lock .
COPY package.json .

RUN bun install --frozen-lockfile

COPY ./ ./

CMD ["bun", "main.ts"]
