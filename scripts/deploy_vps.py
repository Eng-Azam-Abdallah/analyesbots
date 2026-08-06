#!/usr/bin/env python3
"""Deploy Analyes to VPS. Secrets via env vars / local files — never printed."""
import os
import sys
import time
from pathlib import Path

import paramiko

HOST = os.environ.get("DEPLOY_HOST", "158.247.227.80")
USER = os.environ.get("DEPLOY_USER", "root")
PASSWORD = os.environ.get("DEPLOY_PASS")
GH_TOKEN = os.environ.get("GH_TOKEN")
REPO = "Eng-Azam-Abdallah/analyesbots"
APP_DIR = "/var/www/analyes"
BACKEND_PORT = 3016
FRONTEND_PORT = 3017
NGINX_PORT = 3080
LOCAL_ROOT = Path(__file__).resolve().parents[1]

# Force UTF-8 console on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def redact(text: str) -> str:
    safe = text
    for secret in (GH_TOKEN, PASSWORD):
        if secret:
            safe = safe.replace(secret, "***")
    return safe


def log(msg: str) -> None:
    print(redact(msg), flush=True)


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 600) -> tuple[int, str, str]:
    log(f"$ {cmd[:160]}{'...' if len(cmd) > 160 else ''}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        safe = redact(out)
        log(safe[-4000:] if len(safe) > 4000 else safe)
    if err.strip():
        safe_err = redact(err)
        # always show stderr for failures; truncate otherwise
        if code != 0 or "fatal" in err.lower() or "error" in err.lower():
            log(f"[stderr] {safe_err[-2000:]}")
    return code, out, err


def write_remote(ssh: paramiko.SSHClient, path: str, content: str) -> None:
    import base64

    b64 = base64.b64encode(content.encode("utf-8")).decode("ascii")
    code, _, _ = run(
        ssh,
        f"printf '%s' '{b64}' | base64 -d > {path} && chmod 600 {path}",
    )
    if code != 0:
        raise RuntimeError(f"Failed writing {path}")


def main() -> int:
    if not PASSWORD or not GH_TOKEN:
        log("Missing DEPLOY_PASS or GH_TOKEN")
        return 1

    backend_env = LOCAL_ROOT / "backend" / ".env"
    if not backend_env.exists():
        log("Missing local backend/.env")
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    log(f"Connecting to {HOST}...")
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=45)
    log("Connected.")

    # 1) PostgreSQL user + database
    run(
        ssh,
        "sudo -u postgres psql -c \"CREATE USER analyes WITH PASSWORD 'analyes';\" 2>/dev/null || "
        "sudo -u postgres psql -c \"ALTER USER analyes WITH PASSWORD 'analyes';\"",
    )
    run(
        ssh,
        "sudo -u postgres psql -c \"CREATE DATABASE analyes OWNER analyes;\" 2>/dev/null || true",
    )
    run(
        ssh,
        "sudo -u postgres psql -d analyes -c "
        "\"GRANT ALL ON SCHEMA public TO analyes; ALTER SCHEMA public OWNER TO analyes;\"",
    )

    # 2) Clone / update repo (token only in remote URL briefly, then scrubbed)
    clone_url = f"https://x-access-token:{GH_TOKEN}@github.com/{REPO}.git"
    run(ssh, f"mkdir -p $(dirname {APP_DIR})")
    code, out, _ = run(ssh, f"test -d {APP_DIR}/.git && echo EXISTS || echo MISSING")
    if "EXISTS" in out:
        run(
            ssh,
            f"cd {APP_DIR} && git remote set-url origin '{clone_url}' && "
            f"git fetch origin main && git checkout main && git reset --hard origin/main && "
            f"git remote set-url origin https://github.com/{REPO}.git",
        )
    else:
        code, _, _ = run(
            ssh, f"rm -rf {APP_DIR} && git clone --branch main '{clone_url}' {APP_DIR}"
        )
        if code != 0:
            log("git clone failed")
            return 1
        run(ssh, f"cd {APP_DIR} && git remote set-url origin https://github.com/{REPO}.git")

    # 3) Upload backend .env (adjust ports/URL)
    raw = backend_env.read_text(encoding="utf-8")
    lines = []
    for line in raw.splitlines():
        if line.startswith("DATABASE_URL="):
            lines.append(
                "DATABASE_URL=postgresql://analyes:analyes@127.0.0.1:5432/analyes?schema=public"
            )
        elif line.startswith("API_PORT="):
            lines.append(f"API_PORT={BACKEND_PORT}")
        else:
            lines.append(line)
    if not any(l.startswith("API_PORT=") for l in lines):
        lines.insert(1, f"API_PORT={BACKEND_PORT}")
    backend_env_text = "\n".join(lines) + "\n"
    write_remote(ssh, f"{APP_DIR}/backend/.env", backend_env_text)

    frontend_env = (
        f"NEXT_PUBLIC_API_URL=http://{HOST}:{BACKEND_PORT}\n"
        f"PORT={FRONTEND_PORT}\n"
    )
    write_remote(ssh, f"{APP_DIR}/frontend/.env.local", frontend_env)
    write_remote(ssh, f"{APP_DIR}/frontend/.env.production.local", frontend_env)

    # 4) Install + migrate + build
    code, _, _ = run(ssh, f"cd {APP_DIR}/backend && npm install", timeout=900)
    if code != 0:
        log("backend npm install failed")
        return 1

    code, _, _ = run(
        ssh,
        f"cd {APP_DIR}/backend && npx prisma generate && npx prisma migrate deploy",
        timeout=300,
    )
    if code != 0:
        # Try migrate dev / db push as fallback for first deploy
        run(
            ssh,
            f"cd {APP_DIR}/backend && npx prisma db push --accept-data-loss",
            timeout=300,
        )

    code, _, _ = run(ssh, f"cd {APP_DIR}/backend && npm run build", timeout=600)
    if code != 0:
        log("backend build failed")
        return 1

    code, _, _ = run(ssh, f"cd {APP_DIR}/frontend && npm install", timeout=900)
    if code != 0:
        log("frontend npm install failed")
        return 1

    code, _, _ = run(
        ssh,
        f"cd {APP_DIR}/frontend && "
        f"NEXT_PUBLIC_API_URL=http://{HOST}:{BACKEND_PORT} npm run build",
        timeout=900,
    )
    if code != 0:
        log("frontend build failed")
        return 1

    # 5) PM2 ecosystem
    ecosystem = f"""
module.exports = {{
  apps: [
    {{
      name: 'analyes-api',
      cwd: '{APP_DIR}/backend',
      script: 'dist/main.js',
      env: {{
        NODE_ENV: 'production',
        API_PORT: '{BACKEND_PORT}',
      }},
      max_memory_restart: '400M',
    }},
    {{
      name: 'analyes-web',
      cwd: '{APP_DIR}/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p {FRONTEND_PORT} -H 0.0.0.0',
      env: {{
        NODE_ENV: 'production',
        PORT: '{FRONTEND_PORT}',
        NEXT_PUBLIC_API_URL: 'http://{HOST}:{BACKEND_PORT}',
      }},
      max_memory_restart: '500M',
    }},
  ],
}};
"""
    write_remote(ssh, f"{APP_DIR}/ecosystem.config.js", ecosystem)

    nginx_conf = f"""
server {{
    listen {NGINX_PORT};
    listen [::]:{NGINX_PORT};
    server_name _;

    client_max_body_size 20m;

    location /api/ {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT}/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }}

    location / {{
        proxy_pass http://127.0.0.1:{FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
}}
"""
    write_remote(ssh, "/etc/nginx/sites-available/analyes", nginx_conf)
    run(ssh, "chmod 644 /etc/nginx/sites-available/analyes")
    run(ssh, "ln -sfn /etc/nginx/sites-available/analyes /etc/nginx/sites-enabled/analyes")
    code, _, _ = run(ssh, "nginx -t && systemctl reload nginx")
    if code != 0:
        log("nginx reload issue — continuing with direct ports")

    # Open firewall if ufw active
    run(ssh, f"ufw allow {BACKEND_PORT}/tcp || true")
    run(ssh, f"ufw allow {FRONTEND_PORT}/tcp || true")
    run(ssh, f"ufw allow {NGINX_PORT}/tcp || true")

    run(ssh, "pm2 delete analyes-api analyes-web 2>/dev/null || true")
    code, _, _ = run(ssh, f"cd {APP_DIR} && pm2 start ecosystem.config.js")
    if code != 0:
        log("pm2 start failed")
        return 1
    run(ssh, "pm2 save")

    time.sleep(5)
    run(ssh, f"curl -sS -m 10 http://127.0.0.1:{BACKEND_PORT}/health || true")
    run(ssh, f"curl -sS -m 10 -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{FRONTEND_PORT}/ || true")
    run(ssh, "pm2 list --no-color || pm2 jlist | head -c 2000")

    log("")
    log("=== Deploy done ===")
    log(f"Frontend: http://{HOST}:{FRONTEND_PORT}/")
    log(f"API:      http://{HOST}:{BACKEND_PORT}/health")
    log(f"Nginx:    http://{HOST}:{NGINX_PORT}/")
    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
