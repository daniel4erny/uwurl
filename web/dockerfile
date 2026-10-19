FROM oven/bun

COPY bun.lock .
COPY package.json .

RUN bun install --frozen-lockfile

COPY ./ ./

CMD ["bun", "main.js"]
