# Fully containerized deployment on one DigitalOcean Droplet

This mirrors the `tender-v2` deployment: GitHub Actions builds the Next.js
image, while the Droplet runs Next.js, PostgreSQL, MinIO, and Caddy. Only Caddy
publishes ports 80 and 443. PostgreSQL and MinIO remain private Docker services.

## DNS

For `xurjin.com`, point these records to `64.227.17.241` before expecting
public HTTPS:

| Type | Host  | Value           |
| ---- | ----- | --------------- |
| A    | `@`   | `64.227.17.241` |
| A    | `www` | `64.227.17.241` |
| A    | `s3`  | `64.227.17.241` |

Caddy obtains and renews TLS certificates automatically after DNS resolves.
The bare domain redirects to the Georgian landing page at `/ka`; `/en` remains
available directly.

## Droplet layout

The checkout lives at `/opt/shuamo`. The private runtime environment is
`/opt/shuamo/deploy/.env.droplet` with mode `600`. Persistent state is stored in
the `shuamo_postgres_data`, `shuamo_minio_data`, `shuamo_caddy_data`, and
`shuamo_caddy_config` Docker volumes.

## Publish and deploy

### Local deployment helper

`scripts/deploy-droplet.py` is a local operator helper, excluded from Git and
Docker build contexts. Preserve your local copy; a fresh clone does not include it.

From this checkout, run:

```powershell
python scripts/deploy-droplet.py
```

For a release containing new Prisma migrations, review every new
`migration.sql` file and then opt in explicitly:

```powershell
python scripts/deploy-droplet.py --allow-migrations
```

To validate the published image, remote checkout, running containers, and
public health endpoints without changing production:

```powershell
python scripts/deploy-droplet.py --preflight-only
```

Requires Python with `paramiko` installed (`python -m pip install paramiko`),
an authenticated GitHub CLI (`gh auth login`), and a trusted Droplet host key
in the local SSH `known_hosts` file. The helper reads
`SHUAMO_DROPLET_PASSWORD` and optional `SHUAMO_DROPLET_HOST` (default
`64.227.17.241`). On Windows it also reads saved user environment variables,
so an existing terminal can use them without restarting. Keep the password
out of source files and Git.

The helper waits for the main commit's image publication, verifies that the
Droplet can fast-forward to that exact commit, checks the currently running
services and public health endpoints, and makes a validated PostgreSQL backup
under `/opt/shuamo-backups`. It then deploys the immutable SHA image using
`up -d --no-deps app`, so PostgreSQL and MinIO are not restarted. Afterward it
checks both public health endpoints, the running image, completed migrations,
PostgreSQL and MinIO container/mount identities, data counts, and total
commission. Only a fully validated image is saved in the private Droplet
environment file. The backup also contains the previous environment and image
tag for recovery.

If validation fails after replacing the app, the helper automatically restores
the previous app image and checks its health. Database migrations are not rolled
back; use `--allow-migrations` only after confirming they are backward-compatible
with the previous app image. The helper only permits newly added, conventionally
named `migration.sql` files. It always refuses edited or deleted historical
migrations, production Compose changes, entrypoint changes, Caddy changes,
tracked changes on the Droplet, and non-fast-forward updates. It never seeds or
resets production data. Live traffic can legitimately change data counts during
a deployment.

### Reusable agent prompt

```text
Validate all intended changes in the current SHUAMO checkout, commit them directly to main with an appropriate message, and push to origin/main. Do not create or use a Git worktree. Wait for the “Publish application container” GitHub Actions workflow for the exact pushed commit SHA to succeed. Compare that SHA with the commit currently deployed on the Droplet. If the release adds Prisma migrations, inspect every new migration.sql and confirm it is additive and backward-compatible with the previous app image, then deploy with `python scripts/deploy-droplet.py --allow-migrations`; otherwise deploy with `python scripts/deploy-droplet.py`. Use the deployment helper’s backup, health checks, immutable SHA image, data checks, and automatic rollback. Do not restart PostgreSQL or MinIO, do not run `docker compose down`, and do not bypass the helper if it refuses infrastructure changes or unsafe migration changes. Afterward verify the live and ready endpoints, exact running image SHA, completed migrations, unchanged PostgreSQL/MinIO container and mount identities, and the before/after business-data summary. Report the commit, workflow URL, image, backup path, health result, and any CI failure without printing credentials.
```

### Manual deployment

Every push to `main` runs `.github/workflows/publish-container.yml` and publishes
both `ghcr.io/davitmeparishvili/shuamo:latest` and an immutable commit-SHA tag.
The package is private, so the Droplet must stay authenticated to GHCR.

After the workflow succeeds, update the Droplet with:

```sh
cd /opt/shuamo
git pull --ff-only
docker compose --env-file deploy/.env.droplet -f compose.droplet.yaml pull app
docker compose --env-file deploy/.env.droplet -f compose.droplet.yaml up -d app
```

The app entrypoint runs `prisma migrate deploy` before starting the standalone
Next.js server. Check the deployment with:

```sh
docker compose --env-file deploy/.env.droplet -f compose.droplet.yaml ps
docker compose --env-file deploy/.env.droplet -f compose.droplet.yaml logs --tail=100 app caddy
curl https://xurjin.com/api/health/live
curl https://xurjin.com/api/health/ready
```

`docker compose down` preserves all state. Never use `down --volumes` unless
you intentionally want to erase the production database, uploads, and Caddy
certificates.
