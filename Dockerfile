FROM node:24-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@11.21.0 --activate

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Prisma generation needs the complete schema, so lifecycle scripts run later.
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM dependencies AS builder

COPY . .
RUN pnpm prisma generate
# Next evaluates server modules while collecting build output. These are
# non-secret build-only values; the real values are injected at runtime.
ENV NODE_ENV=production \
    SHUAMO_STANDALONE=1 \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    DATABASE_URL_TEST=postgresql://build:build@localhost:5432/build_test \
    APP_URL=http://build.local \
    AUTH_SECRET=build-only-auth-secret-012345678901234567890123 \
    FINGERPRINT_SECRET=build-only-fingerprint-secret-0123456789012345 \
    STORAGE_ENDPOINT=http://storage.build.local \
    STORAGE_PUBLIC_ENDPOINT=http://storage.build.local \
    STORAGE_REGION=us-east-1 \
    STORAGE_BUCKET=build-only \
    STORAGE_ACCESS_KEY_ID=build-only-access-key \
    STORAGE_SECRET_ACCESS_KEY=build-only-secret-key
RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production

# Keep Prisma CLI and tsx so startup migrations and operator scripts can run.
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod 755 docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
