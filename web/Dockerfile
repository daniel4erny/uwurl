FROM oven/bun

ENV NODE_ENV=production

COPY bun.lock .
COPY package.json .

RUN bun install --frozen-lockfile

COPY ./ ./

CMD ["bun", "main.js"]
