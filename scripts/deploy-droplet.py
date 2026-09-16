"""Deploy the published main image without restarting PostgreSQL or MinIO.

Run: python scripts/deploy-droplet.py
Requires Python, paramiko, an authenticated gh CLI, and SHUAMO_DROPLET_PASSWORD.
On Windows, saved user environment variables are read even in an older terminal.
"""

import json
import os
import shlex
import subprocess
import sys
import time

import paramiko

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def setting(name, default=None):
    value = os.environ.get(name)
    if value is None and sys.platform == "win32":
        import winreg

        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
                value = winreg.QueryValueEx(key, name)[0]
        except FileNotFoundError:
            pass
    return value or default


def gh(*args):
    return json.loads(subprocess.check_output(["gh", *args], encoding="utf-8"))


def main():
    password = setting("SHUAMO_DROPLET_PASSWORD")
    if not password:
        raise RuntimeError("Set SHUAMO_DROPLET_PASSWORD in your user environment first.")
    repo = "DavitMeparishvili/SHUAMO"
    sha = gh("api", f"repos/{repo}/commits/main")["sha"]
    print(f"Waiting for the published image for {sha}...", flush=True)
    for _ in range(80):
        runs = gh("run", "list", "--repo", repo, "--workflow", "publish-container.yml",
                  "--commit", sha, "--limit", "1", "--json", "status,conclusion")
        if runs and runs[0]["status"] == "completed":
            if runs[0]["conclusion"] != "success":
                raise RuntimeError("Image publishing failed; production was not changed.")
            break
        time.sleep(15)
    else:
        raise RuntimeError("Image publishing is still pending. Run this script again later.")

    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    client.connect(setting("SHUAMO_DROPLET_HOST", "64.227.17.241"), username="root",
                   password=password, timeout=20, look_for_keys=False, allow_agent=False)

    def run(command):
        _, stdout, stderr = client.exec_command(command, timeout=600)
        channel = stdout.channel
        chunks = []
        deadline = time.monotonic() + 600
        while not channel.exit_status_ready() or channel.recv_ready() or channel.recv_stderr_ready():
            if time.monotonic() > deadline:
                channel.close()
                raise RuntimeError("Remote command exceeded ten minutes; inspect the deployment before retrying.")
            if channel.recv_ready():
                message = channel.recv(32768).decode("utf-8", errors="replace")
                chunks.append(message)
                print(message.replace(password, "[REDACTED]"), end="", flush=True)
            if channel.recv_stderr_ready():
                message = channel.recv_stderr(32768).decode("utf-8", errors="replace")
                print(message.replace(password, "[REDACTED]"), end="", flush=True)
            time.sleep(0.1)
        if channel.recv_exit_status():
            raise RuntimeError("Remote command failed. See output above; backups are retained.")
        return "".join(chunks).strip()

    compose = "docker compose --env-file deploy/.env.droplet -f compose.droplet.yaml"
    image = f"ghcr.io/davitmeparishvili/shuamo:{sha}"
    try:
        run("cd /opt/shuamo && git fetch origin main")
        run(f"cd /opt/shuamo && git diff --quiet && git diff --cached --quiet "
            f"&& git merge-base --is-ancestor HEAD {shlex.quote(sha)} "
            f"&& test -z \"$(git diff --name-only HEAD {sha} -- prisma/migrations compose.droplet.yaml docker-entrypoint.sh deploy/Caddyfile.droplet)\"")
        services_before = run("docker inspect shuamo-postgres-1 shuamo-minio-1 "
                              "--format '{{.Id}} {{json .Mounts}}'")
        previous = run("docker inspect shuamo-app-1 --format '{{.Config.Image}}'")
        backup = run("set -eu; umask 077; backup=/opt/shuamo-backups/$(date -u +%Y%m%dT%H%M%SZ)-code-deploy; "
                     "mkdir -p \"$backup\"; "
                     "docker exec shuamo-postgres-1 sh -c 'pg_dump -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -Fc' > \"$backup/postgres.dump\"; "
                     "docker exec -i shuamo-postgres-1 pg_restore --list < \"$backup/postgres.dump\" >/dev/null; "
                     "cp /opt/shuamo/deploy/.env.droplet \"$backup/env.droplet\"; "
                     "docker inspect shuamo-app-1 --format '{{.Config.Image}}' > \"$backup/previous-image.txt\"; "
                     "printf '%s' \"$backup\"")
        snapshot_sql = """SELECT 'users', count(*)::text FROM app_user
UNION ALL SELECT 'products', count(*)::text FROM product
UNION ALL SELECT 'sales', count(*)::text FROM conversion
UNION ALL SELECT 'attributions', count(*)::text FROM attribution
UNION ALL SELECT 'commission', coalesce(sum(commission_amount),0)::text FROM attribution
UNION ALL SELECT 'payments', count(*)::text FROM finance_payment
UNION ALL SELECT 'invoices', count(*)::text FROM finance_invoice
UNION ALL SELECT 'migrations', count(*)::text FROM _prisma_migrations WHERE finished_at IS NOT NULL;
"""
        snapshot_command = ("docker exec -i shuamo-postgres-1 sh -c 'psql -v ON_ERROR_STOP=1 -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -At' <<'SQL'\n"
                            + snapshot_sql + "SQL\n")
        before = run(snapshot_command)
        run(f"cd /opt/shuamo && APP_IMAGE={image} {compose} pull app")
        run(f"cd /opt/shuamo && git merge --ff-only {sha} "
            f"&& APP_IMAGE={image} {compose} up -d --no-deps app")
        for path in ("live", "ready"):
            run(f"curl --fail --silent --show-error --retry 18 --retry-all-errors "
                f"--retry-delay 3 --max-time 10 https://xurjin.com/api/health/{path}")
        actual_image = run("docker inspect shuamo-app-1 --format '{{.Config.Image}}'")
        if actual_image != image:
            raise RuntimeError("Running app image does not match the requested commit.")
        run(f"cd /opt/shuamo && sed -i 's|^APP_IMAGE=.*|APP_IMAGE={image}|' deploy/.env.droplet "
            f"&& {compose} logs --tail=35 app && {compose} ps")
        services_after = run("docker inspect shuamo-postgres-1 shuamo-minio-1 "
                             "--format '{{.Id}} {{json .Mounts}}'")
        if services_before != services_after:
            raise RuntimeError("Database or storage container/mount identity changed unexpectedly.")
        after = run(snapshot_command)
        print("Data summary unchanged." if before == after else
              "Data summary changed during deployment; compare above output for live traffic or unexpected changes.")
        print(f"Deployed {sha}. Backup: {backup}. Previous image: {previous}")
    finally:
        client.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Deployment stopped: {error}", file=sys.stderr)
        sys.exit(1)
