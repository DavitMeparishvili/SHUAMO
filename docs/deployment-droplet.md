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

From this checkout, run:

```powershell
python scripts/deploy-droplet.py
```

Requires Python with `paramiko` installed (`python -m pip install paramiko`),
an authenticated GitHub CLI (`gh auth login`), and a trusted Droplet host key
in the local SSH `known_hosts` file. The helper reads
`SHUAMO_DROPLET_PASSWORD` and optional `SHUAMO_DROPLET_HOST` (default
`64.227.17.241`). On Windows it also reads saved user environment variables,
so an existing terminal can use them without restarting. Keep the password
out of source files and Git.

The helper waits for the main commit's image publication, makes and validates
a PostgreSQL backup under `/opt/shuamo-backups`, deploys the immutable SHA image
using `up -d --no-deps app`, and checks both public health endpoints. It preserves
PostgreSQL and MinIO container/mount identities, compares data counts and total
commission before and after, and saves the successful image tag in the private
Droplet environment file. Live traffic can legitimately change data counts.
The backup also contains the previous environment and image tag for recovery.

This helper is for code-only releases. It refuses tracked changes on the Droplet,
non-fast-forward updates, and changes to migrations, the production Compose file,
the entrypoint, or Caddy configuration. Deploy those separately after reviewing
their data and infrastructure implications. It does not seed or reset data.

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
