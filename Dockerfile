# ----- Build stage -----
FROM node:22-bullseye-slim AS build
WORKDIR /app

# System deps for native modules (e.g. better-sqlite3) during build only
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# Keep only prod deps for the final image
RUN npm prune --omit=dev

# ----- Runtime stage -----
FROM node:22-bullseye-slim AS runtime
ENV NODE_ENV=production \
    DB_PATH=/data/faucet.sqlite
WORKDIR /app

# Use the built-in non-root user from the Node image
RUN mkdir -p /data && chown -R node:node /data /app
USER node

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Reads env from container/compose; dotenv is optional but kept for parity
CMD ["node", "--require", "dotenv/config", "dist/index.js"]
