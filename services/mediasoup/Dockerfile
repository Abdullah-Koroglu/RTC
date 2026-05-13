FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY services/api/package.json services/api/package.json
COPY services/signaling/package.json services/signaling/package.json
COPY services/mediasoup/package.json services/mediasoup/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/rtc-sdk/package.json packages/rtc-sdk/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/ ./
COPY . .
RUN pnpm --filter @repo/mediasoup exec tsup src/index.ts --format esm --target node20 --out-dir dist --clean

FROM node:20-bookworm-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production
RUN groupadd --system nodejs && useradd --system --gid nodejs appuser

COPY --from=deps /repo/ /repo/
COPY --from=builder /repo/services/mediasoup/dist /repo/services/mediasoup/dist

USER appuser

EXPOSE 4020
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 CMD node -e "fetch('http://127.0.0.1:4020/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "services/mediasoup/dist/index.js"]
