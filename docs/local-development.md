# Run Xurjin locally with the seeded data

## Everyday startup on this computer

Start Docker Desktop and wait until its engine is running. Open PowerShell:

```powershell
Set-Location C:\Users\mefar\repos\SHUAMO
docker compose up -d --wait postgres-dev minio
$env:APP_URL = 'http://localhost:3001'
$env:XURJIN_BUILD_DIR = '.next-discovery'
pnpm dev -p 3001
```

Open <http://localhost:3001/ka/sign-in> for Georgian or <http://localhost:3001/en/sign-in> for English. Keep the PowerShell window running. Port 3001 is explicit; if another copy already uses it, reuse that copy or stop it before starting another.

The environment assignments apply only to this PowerShell session. The existing `.env` defaults to port 3000, so repeat the assignments when opening a new terminal. `APP_URL` must match the browser origin for authentication and generated links. `.next-discovery` holds development build files separately from production builds; it does not contain application data.

No install, migration or seed command is needed for an ordinary restart of this already-configured checkout. After pulling dependency/schema changes, run `pnpm install`, `pnpm db:migrate:deploy`, and `pnpm db:generate` before starting the app. Do not use a database reset to apply migrations.

## Where the data lives

| Purpose                              | Service / address                                                        | Persistence                                             |
| ------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| Application records and seeded sales | PostgreSQL 17, `postgres-dev`, `localhost:5432`, database `shuamo_dev`   | Compose volume `shuamo_dev_data`                        |
| Images and uploaded assets           | MinIO, `minio`, `localhost:9000`, bucket `shuamo-product-images`         | Compose volume `shuamo_minio_data`                      |
| Automated integration tests          | PostgreSQL 17, `postgres-test`, `localhost:5433`, database `shuamo_test` | Temporary memory-backed storage; separate from app data |

Connection settings live in the uncommitted `.env`: `DATABASE_URL` selects the application database, `DATABASE_URL_TEST` selects the test database, and `STORAGE_*` selects MinIO. Compose normally prefixes volume names with `shuamo_`; keep using this checkout and Compose project to reuse the existing volumes.

Stopping the app, restarting Windows, or stopping these containers preserves the development database and images. Stop the app with **Ctrl+C**. Optionally stop its services with:

```powershell
docker compose stop postgres-dev minio
```

Do not delete the Docker volumes or use `docker compose down -v` if you want to keep this data. Git commits preserve code, migrations and seed scripts; they do not contain the current database, MinIO contents, `.env`, or local browser screenshots.

## Demo sign-in

All accounts below use the local fixture password `seeded-password-01`.

| Role             | Email                       |
| ---------------- | --------------------------- |
| Brand: Aromashop | `brand@aromashop.ge`        |
| Creator: Nino    | `nino@creators.ge`          |
| Creator: Dato    | `dato@creators.ge`          |
| Creator: Mari    | `mari.redesign@creators.ge` |

Creator Overview is `/ka/creator`; Creator Performance is `/ka/creator/earnings`. Brand Overview is `/ka/brand`; Brand Performance is `/ka/brand/performance`. Replace `/ka` with `/en` for English.

## If the charts look empty later

The default range is the last 30 days, so existing sample sales eventually fall outside it. Select **All time** to inspect the preserved data. If you explicitly want to move the dedicated redesign fixture dates into a recent period, run:

```powershell
pnpm seed:redesign
```

This reuses its deterministic records and updates their sample click/sale/cancellation dates. It is an intentional data change, so it is not part of everyday startup. The dedicated seed provides 945 sample clicks and 180 sales alongside the existing fixtures.

## First-time setup on a fresh local database only

Use this section for a new checkout/database, not to resume the current data. Prerequisites are Docker Desktop, Node.js 24 and the repository's pnpm version (`11.21.0` in `package.json`). Create `.env` from `.env.example` only if it does not exist, and set `AUTH_SECRET` and `FINGERPRINT_SECRET` to separate random values of at least 40 characters. Preserve the existing `.env` on this computer.

```powershell
pnpm install
docker compose up -d --wait postgres-dev minio
pnpm storage:init
pnpm db:migrate:deploy
pnpm db:generate
pnpm seed:phase-2
pnpm seed:phase-3
pnpm seed:media
pnpm seed:redesign
```

Then use the everyday startup commands above. Phase 2 creates base accounts, Phase 3 creates catalogue/partnership fixtures, media seeding uploads images, and redesign seeding adds reporting activity and additional creator states. The older phase seeds reset parts of the fixture state; do not rerun them against data you intend to preserve.

## Prompt to use next time

> Start Xurjin from C:\Users\mefar\repos\SHUAMO using the existing seeded shuamo_dev database. Follow docs/local-development.md. Start or reuse PostgreSQL and MinIO, preserve all database and image volumes, and run the app at http://localhost:3001 with APP_URL matching that origin and XURJIN_BUILD_DIR=.next-discovery. Do not reset or reseed the data. Check the sign-in page and give me the URL and demo account details.
