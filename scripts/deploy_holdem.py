#!/usr/bin/env python3
"""Deploy holdem web host to kuroneko.chat/holdem/ (secrets stay out of git)."""
from __future__ import annotations

import os
import tarfile
import tempfile
from pathlib import Path

import paramiko

REPO = Path(r"D:\UGit\holdem")
KURONEKO_ENV = Path(r"D:\kuroneko\.local\kuroneko.env")
HOLDEM_ENV = Path(r"D:\kuroneko\.local\holdem.env")
REMOTE_DIR = "/opt/holdem"
REMOTE_PORT = "3010"

EXCLUDE_DIRS = {".git", "node_modules", "coverage", "dist", ".cursor"}
EXCLUDE_FILES = {".env", "holdem.env"}


def read_kv(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def should_skip(arc: str) -> bool:
    parts = Path(arc).parts
    if any(p in EXCLUDE_DIRS for p in parts):
        return True
    if Path(arc).name in EXCLUDE_FILES:
        return True
    return False


def make_tarball(dest: Path) -> None:
    with tarfile.open(dest, "w:gz") as tar:
        for root, dirs, files in os.walk(REPO):
            rel_root = Path(root).relative_to(REPO)
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for name in files:
                full = Path(root) / name
                arc = str(rel_root / name).replace("\\", "/")
                if should_skip(arc):
                    continue
                tar.add(full, arcname=arc)


NGINX_SNIPPET = r"""
    # ========== holdem ==========
    location ^~ /holdem/ {
        proxy_pass         http://127.0.0.1:3010/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Cookie            $http_cookie;
        proxy_pass_request_headers on;
    }
"""


def ensure_nginx(client: paramiko.SSHClient) -> None:
    conf = "/etc/nginx/conf.d/kuroneko.chat.conf"
    cmd = f"""python3 - <<'PY'
from pathlib import Path
conf = Path({conf!r})
text = conf.read_text()
snip = {NGINX_SNIPPET!r}
if 'location ^~ /holdem/' in text:
    print('already')
else:
    idx = text.rfind('}}')
    if idx < 0:
        raise SystemExit('no closing brace')
    text = text[:idx] + snip + '\\n' + text[idx:]
    conf.write_text(text)
    print('inserted')
PY
nginx -t && systemctl reload nginx
"""
    _, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err.strip():
        print("nginx stderr:", err[:1000])


def main() -> None:
    ssh_kv = read_kv(KURONEKO_ENV)
    holdem_kv = read_kv(HOLDEM_ENV)
    if not ssh_kv.get("KURONEKO_SSH_PASSWORD"):
        raise SystemExit("missing KURONEKO_SSH_PASSWORD in .local/kuroneko.env")
    if not holdem_kv.get("GITHUB_CLIENT_ID") or not holdem_kv.get("GITHUB_CLIENT_SECRET"):
        raise SystemExit("missing GITHUB_CLIENT_* in .local/holdem.env")

    with tempfile.NamedTemporaryFile(suffix=".tgz", delete=False) as tmp:
        tar_path = Path(tmp.name)
    print("packing…")
    make_tarball(tar_path)
    print(f"tarball {tar_path.stat().st_size/1024:.1f} KB")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        ssh_kv.get("KURONEKO_SSH_HOST", "43.156.244.45"),
        port=int(ssh_kv.get("KURONEKO_SSH_PORT", "22")),
        username=ssh_kv.get("KURONEKO_SSH_USER", "root"),
        password=ssh_kv["KURONEKO_SSH_PASSWORD"],
        timeout=30,
        look_for_keys=False,
        allow_agent=False,
    )

    sftp = client.open_sftp()
    print("upload tarball…")
    sftp.put(str(tar_path), "/tmp/holdem.tgz")
    # write remote env (never commit)
    env_lines = [
        f"GITHUB_CLIENT_ID={holdem_kv['GITHUB_CLIENT_ID']}",
        f"GITHUB_CLIENT_SECRET={holdem_kv['GITHUB_CLIENT_SECRET']}",
        f"TABLE_TOKEN_SECRET={holdem_kv.get('TABLE_TOKEN_SECRET', 'holdem-prod-hmac')}",
        "HOLDEM_PUBLIC_BASE=https://kuroneko.chat/holdem",
        "HOLDEM_REDIRECT_URI=https://kuroneko.chat/holdem/oauth/callback",
        f"HOLDEM_PORT={REMOTE_PORT}",
        "NODE_ENV=production",
    ]
    if holdem_kv.get("HOLDEM_TEST_SECRET"):
        env_lines.append(f"HOLDEM_TEST_SECRET={holdem_kv['HOLDEM_TEST_SECRET']}")
    with sftp.file(f"{REMOTE_DIR}.env.tmp", "w") as f:
        f.write("\n".join(env_lines) + "\n")
    sftp.close()
    tar_path.unlink(missing_ok=True)

    remote = f"""
set -e
mkdir -p {REMOTE_DIR}
tar -xzf /tmp/holdem.tgz -C {REMOTE_DIR}
mv -f {REMOTE_DIR}.env.tmp {REMOTE_DIR}/.env
cd {REMOTE_DIR}
# load nvm if present
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
node -v
npm install --omit=dev
# pm2 ecosystem
cat > ecosystem.config.cjs <<'EOF'
module.exports = {{
  apps: [{{
    name: 'holdem',
    cwd: '{REMOTE_DIR}',
    script: 'npm',
    args: 'start',
    env: {{
      NODE_ENV: 'production'
    }},
    env_file: '{REMOTE_DIR}/.env'
  }}]
}};
EOF
# pm2 may not support env_file; export via dotenv wrapper
cat > start.sh <<'EOF'
#!/bin/bash
set -a
. {REMOTE_DIR}/.env
set +a
cd {REMOTE_DIR}
exec npx tsx src/hosts/web/server.ts
EOF
chmod +x start.sh
pm2 delete holdem 2>/dev/null || true
pm2 start {REMOTE_DIR}/start.sh --name holdem
pm2 save
echo PM2_OK
curl -sS -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{REMOTE_PORT}/ || true
echo
"""
    print("remote install…")
    _, stdout, stderr = client.exec_command(remote, timeout=300)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    Path(r"D:\UGit\holdem\scripts\_deploy_out.txt").write_text(out + "\nSTDERR\n" + err, encoding="utf-8")
    print(out.encode("ascii", "replace").decode("ascii"))
    if err.strip():
        print("stderr:", err[-2000:].encode("ascii", "replace").decode("ascii"))

    ensure_nginx(client)
    client.close()
    print("DONE https://kuroneko.chat/holdem/")


if __name__ == "__main__":
    main()
