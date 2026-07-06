# AI Hot Radar 部署说明 - Next.js 版本

## 🚀 快速部署

### 方式一：使用 release.sh（推荐）

```bash
# 1. 本地构建并推送到 Docker Hub
./release.sh

# 2. 自动部署到服务器（需要配置 SERVER_HOST）
SERVER_HOST=root@aihotradar.com ./release.sh

# 3. 只构建前端
./release.sh frontend

# 4. 只构建后端
./release.sh backend

# 5. 无缓存完整重建
./release.sh nocache
```

### 方式二：服务器直接拉取

```bash
# 在服务器上执行
cd /www/dk_project/ai_hot_radar

# 拉取最新镜像
docker compose pull

# 重启服务
docker compose up -d

# 清理旧镜像
docker image prune -f
```

---

## 📦 端口配置变更

### Next.js 迁移后的端口

| 服务 | 容器内端口 | 宿主机端口 | 说明 |
|------|-----------|-----------|------|
| client (Next.js) | 3000 | 3000 | **从 8080 改为 3000** |
| server (NestJS) | 3001 | 3001 | 不变 |
| nginx | 80 | 80 | 不变 |

### ⚠️ 重要变更

**端口从 8080 改为 3000**：
- **旧版（Vite）**: 容器内 nginx 80 映射到宿主机 8080
- **新版（Next.js）**: Next.js 3000 直接映射到宿主机 3000
- **Nginx**: 通过 nginx 容器统一代理，对外仍是 80 端口

### 如果服务器防火墙/安全组配置了端口

**不需要修改防火墙配置**，因为：

1. **对外访问**: 仍然通过 nginx 的 80 端口（或反向代理的 443）
2. **docker-compose**: nginx 容器内部通过 Docker 网络访问 client:3000
3. **宿主机端口**: 3000 和 3001 仅用于调试，可以不暴露到公网

### 如果需要纯净部署（不暴露 3000/3001）

修改 `docker-compose.yml`：

```yaml
services:
  client:
    build: ./client-next
    # 不映射到宿主机，只在 Docker 网络内访问
    expose:
      - "3000"
    # 移除 ports 配置
    # ports:
    #   - "3000:3000"
    
  server:
    build: ./server
    expose:
      - "3001"
    # 移除 ports 配置
    # ports:
    #   - "3001:3001"

  nginx:
    ports:
      - "80:80"  # 只暴露 nginx
```

---

## 🔧 服务器配置检查

### 1. 检查当前运行的端口

```bash
# 查看监听端口
netstat -tlnp | grep -E '80|3000|3001|8080'

# 或使用 ss
ss -tlnp | grep -E '80|3000|3001|8080'
```

### 2. 检查 Docker 容器

```bash
# 查看运行中的容器
docker ps

# 查看端口映射
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### 3. 检查防火墙规则

```bash
# CentOS/RHEL
firewall-cmd --list-ports

# Ubuntu/Debian
ufw status

# 如果使用宝塔面板
# 在面板 → 安全 → 查看放行端口
```

### 4. 检查 Nginx 反向代理（宝塔面板）

如果使用宝塔面板反向代理：

**旧配置（指向 8080）需要改为指向 80**：

```nginx
# 宝塔面板 → 网站 → aihotradar.com → 配置文件

# ❌ 旧配置（错误）
location / {
    proxy_pass http://127.0.0.1:8080;
}

# ✅ 新配置（正确）
location / {
    proxy_pass http://127.0.0.1:80;
}

# 或者直接指向 Docker Compose 的 nginx 服务
```

---

## 🎯 部署步骤（完整版）

### 步骤 1：本地构建镜像

```bash
# 在开发机上执行
cd ai-hot-radar

# 构建并推送
./release.sh

# 或手动构建
docker buildx build --platform linux/amd64 -t zenitlab/ai-hot-radar-frontend:latest --push ./client-next
docker buildx build --platform linux/amd64 -t zenitlab/ai-hot-radar-backend:latest --push ./server
```

### 步骤 2：服务器拉取更新

```bash
# SSH 到服务器
ssh root@aihotradar.com

# 进入项目目录
cd /www/dk_project/ai_hot_radar

# 拉取最新镜像
docker compose pull

# 停止旧容器
docker compose down

# 启动新容器
docker compose up -d

# 查看日志
docker compose logs -f --tail=100
```

### 步骤 3：验证部署

```bash
# 检查容器状态
docker compose ps

# 检查前端（Next.js）
curl http://localhost:3000

# 检查后端 API
curl http://localhost:3001/api/agent/stats

# 检查 nginx
curl http://localhost:80

# 检查外网访问
curl https://aihotradar.com/api/agent/stats
```

---

## 🐛 常见问题

### Q1: 启动后无法访问

**排查步骤**：

```bash
# 1. 检查容器是否启动
docker compose ps

# 2. 查看容器日志
docker compose logs client
docker compose logs server
docker compose logs nginx

# 3. 检查端口占用
netstat -tlnp | grep -E '80|3000|3001'

# 4. 进入容器检查
docker exec -it ai-hot-radar-client-1 sh
docker exec -it ai-hot-radar-server-1 sh
```

### Q2: 前端显示 API 连接失败

**原因**: Next.js 的 API 代理配置问题

**解决**:

```bash
# 检查环境变量
docker exec ai-hot-radar-client-1 env | grep NEXT_PUBLIC

# 应该看到
# NEXT_PUBLIC_API_URL=http://server:3001

# 如果不对，修改 docker-compose.yml 后重启
docker compose up -d
```

### Q3: 构建失败 "Error: Missing getServerSnapshot"

**原因**: digest 页面需要 edge runtime

**解决**: 已在代码中修复，确保使用最新代码：

```bash
# 拉取最新代码
git pull origin main

# 重新构建
./release.sh nocache
```

### Q4: Docker 内存不足

**解决**:

```bash
# 增加 Docker 内存限制（Docker Desktop）
# 设置 → Resources → Memory → 4GB+

# 或在 docker-compose.yml 中限制内存
services:
  client:
    mem_limit: 1g
  server:
    mem_limit: 512m
```

---

## 📊 监控和维护

### 实时日志

```bash
# 查看所有日志
docker compose logs -f

# 只看前端日志
docker compose logs -f client

# 只看后端日志
docker compose logs -f server

# 最近 100 行
docker compose logs --tail=100
```

### 资源使用

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df

# 清理无用镜像
docker image prune -a -f

# 清理无用容器
docker container prune -f
```

### 数据备份

```bash
# 备份数据库
docker compose exec server sh -c 'cp /app/data/dev.db /app/data/backup-$(date +%Y%m%d).db'

# 复制到宿主机
docker cp ai-hot-radar-server-1:/app/data/dev.db ./backup/
```

---

## 🔄 回滚到旧版本

如果新版本有问题，快速回滚：

```bash
# 方案 1: 使用旧的镜像标签（如果有）
docker compose pull zenitlab/ai-hot-radar-frontend:old-vite-version

# 方案 2: 临时切换到旧代码
cd /www/dk_project/ai_hot_radar
git stash
git checkout <旧的commit-hash>
docker compose up -d --build

# 方案 3: 使用备份的镜像
docker pull zenitlab/ai-hot-radar-frontend:backup
docker tag zenitlab/ai-hot-radar-frontend:backup zenitlab/ai-hot-radar-frontend:latest
docker compose up -d
```

---

## ✅ 部署检查清单

部署完成后，依次检查：

- [ ] `docker compose ps` 显示所有容器 Up
- [ ] `curl http://localhost:3000` 返回 Next.js 页面
- [ ] `curl http://localhost:3001/api/agent/stats` 返回 JSON
- [ ] `curl http://localhost:80` 返回页面
- [ ] 浏览器访问 `https://aihotradar.com` 正常
- [ ] 前端主题切换正常
- [ ] 后端 API 调用正常
- [ ] WebSocket 实时推送正常（我的关注页面）
- [ ] 查看日志无错误：`docker compose logs --tail=50`

---

## 📝 总结

### Next.js 迁移后的变化

| 项目 | 旧版（Vite） | 新版（Next.js） | 影响 |
|------|-------------|----------------|------|
| 前端目录 | `client` | `client-next` | release.sh 已更新 |
| 容器端口 | 80 (nginx) | 3000 (Next.js) | docker-compose.yml 已更新 |
| 构建时间 | ~30s | ~2min | 首次构建较慢 |
| 镜像大小 | ~100MB | ~200MB | Next.js standalone 模式 |
| 宿主机端口 | 8080 | 3000 | 需确认防火墙 |

### 是否需要改服务器配置？

**大多数情况不需要**，因为：
- ✅ Nginx 仍然监听 80 端口
- ✅ Docker 内部网络自动处理
- ✅ 对外访问路径不变

**仅在以下情况需要修改**：
- ❌ 宝塔面板反向代理直接指向了 8080 端口
- ❌ 防火墙硬编码了 8080 端口规则
- ❌ 外部监控直接访问 8080 端口

**修改方案**：
将所有指向 `8080` 的配置改为 `80`（nginx 端口）

---

**部署完成时间**: 2026-07-06  
**文档版本**: v1.0 (Next.js 15)  
**维护**: Claude (Kiro AI Assistant)
