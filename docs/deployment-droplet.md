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

## Droplet layout

The checkout lives at `/opt/shuamo`. The private runtime environment is
`/opt/shuamo/deploy/.env.droplet` with mode `600`. Persistent state is stored in
the `shuamo_postgres_data`, `shuamo_minio_data`, `shuamo_caddy_data`, and
`shuamo_caddy_config` Docker volumes.

## Publish and deploy

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
