FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat wget \
	&& corepack enable

FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY services/api/package.json services/api/package.json
COPY services/signaling/package.json services/signaling/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/rtc-sdk/package.json packages/rtc-sdk/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/ ./
COPY . .
RUN pnpm --filter @repo/signaling exec tsup src/index.ts --format esm --target node20 --out-dir dist --clean

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S appuser -G nodejs

COPY --from=deps /repo/ /repo/
COPY --from=builder /repo/services/signaling/dist /repo/services/signaling/dist

USER appuser

EXPOSE 4010
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 CMD wget -qO- http://127.0.0.1:4010/health || exit 1
CMD ["node", "services/signaling/dist/index.js"]
