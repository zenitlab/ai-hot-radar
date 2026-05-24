# 🚀 Production Deployment Guide

Deploy AI Hot Radar to your own server with Docker. The stack is two
containers (NestJS backend + Nginx-served React frontend) plus a host
reverse proxy for TLS.

## 📦 Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker | ≥ 24 | `docker --version` |
| Docker Compose | ≥ v2 | `docker compose version` (no dash) |
| Host Nginx (or BT panel / Caddy / Traefik) | — | Terminates TLS, proxies to `127.0.0.1:8080` |
| A domain pointed at the server | — | e.g. `aihotradar.com` |

Server specs: **1 core / 1 GB RAM** is the comfortable minimum;
**2 core / 4 GB** is plenty for personal scale.

## 🧰 First-time Setup

```bash
# 1. Clone the repo on the server
git clone https://github.com/zenitlab/ai-hot-radar.git
cd ai-hot-radar

# 2. Create the production env file from the template
cp server/.env.production.example server/.env.production
vim server/.env.production    # fill in the AI key + CLIENT_URL at minimum

# 3. Boot the stack
docker compose up -d --build

# 4. Verify
docker compose ps             # both services should be "Up"
curl -s http://127.0.0.1:8080 | head -1   # should return <!doctype html>
curl -s http://127.0.0.1:8080/api/agent/stats   # should return JSON
```

The backend stores SQLite at `./data/dev.db` on the host
(mounted into the container). On first boot it runs
`prisma db push` automatically — no manual schema migration needed.

## 🌐 TLS / Reverse Proxy

The frontend container binds **only to `127.0.0.1:8080`**, never to
the public interface. Your host Nginx terminates HTTPS and forwards
internal traffic. Sample Nginx site config:

```nginx
# /etc/nginx/sites-available/aihotradar.conf
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name aihotradar.com;

    ssl_certificate     /etc/letsencrypt/live/aihotradar.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aihotradar.com/privkey.pem;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # WebSocket (socket.io) needs Upgrade headers
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}

# www → apex 301
server {
    listen 80;
    listen 443 ssl http2;
    server_name www.aihotradar.com;
    ssl_certificate     /etc/letsencrypt/live/aihotradar.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aihotradar.com/privkey.pem;
    return 301 https://aihotradar.com$request_uri;
}

# HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name aihotradar.com www.aihotradar.com;
    return 301 https://aihotradar.com$request_uri;
}
```

Get the cert with Certbot:

```bash
certbot --nginx -d aihotradar.com -d www.aihotradar.com
```

If you're on a Chinese cloud provider with a control panel (宝塔
/ 1Panel), use its built-in reverse-proxy UI and point it at
`http://127.0.0.1:8080`. Same outcome, less typing.

## 🔄 Updating

After pushing changes to GitHub, on the server:

```bash
cd /path/to/ai-hot-radar
./update.sh
```

The script does:

1. **Backs up SQLite** → `./data/backups/dev.db.YYYYMMDD-HHMMSS`
   (keeps the last 10)
2. `git pull --ff-only`
3. `docker compose up -d --build` — only changed services rebuild
4. Prunes dangling images

**Selective rebuild:**

```bash
./update.sh frontend   # only the React/Nginx container
./update.sh backend    # only the NestJS container
./update.sh nocache    # full no-cache rebuild (slow, but fixes weird cache states)
```

Downtime is **a few seconds** — Docker swaps the running container
once the new build is healthy.

## 🩺 Troubleshooting

### Containers won't start

```bash
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

Most common: missing `OPENAI_API_KEY` in `server/.env.production`,
or `DATABASE_URL` pointing somewhere the container can't write.

### "Cannot find module @prisma/client"

The Prisma client is generated during the Docker build but tied to
the host's libc + OpenSSL. If you copied a `node_modules` directory
into the build context, that breaks. **Don't** — let Docker do the
install. The `.dockerignore` should exclude `node_modules`.

### Out of disk space

```bash
docker system prune -af --volumes   # nukes unused images / volumes
ls -lh ./data/dev.db                 # SQLite file size
ls -lht ./data/backups/              # rotated backups
```

The SQLite file grows ~1 MB per 1000 hotspots. The default scheduler
auto-cleans rows older than 30 days at 03:30 daily.

### Want to run a one-shot scan immediately

```bash
curl -X POST http://127.0.0.1:8080/api/hotspots/check
```

Or click "立即扫描" on the 热点雷达 page.

## 🔐 Notes on secrets

- `.env.production` is **gitignored**; only `.env.production.example`
  is tracked. Never `git add server/.env.production`.
- API keys live on the server filesystem; the only thing that hits
  Git is the template.
- The SQLite DB is also gitignored (`*.db`). Back it up via
  `./update.sh` (automatic) or `cp ./data/dev.db elsewhere`.

## 📚 Related

- [docs/LOCAL_SETUP.md](LOCAL_SETUP.md) — local dev (no Docker)
- [docs/API_INTEGRATION.md](API_INTEGRATION.md) — Agent / RSS / REST
- [README](../README.md) — project overview
