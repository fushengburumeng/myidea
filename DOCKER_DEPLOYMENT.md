# Docker 部署指南 (Ubuntu 24.04 LTS)

## 概述

本文档提供在 Ubuntu 24.04 LTS 服务器上使用 Docker 部署围棋游戏平台（含AI引擎）的完整指南。

**服务器配置要求：**
- CPU: 2核或以上
- 内存: 2GB 或以上
- 硬盘: 至少 2GB 可用空间
- 系统: Ubuntu 24.04 LTS (x86_64)

**包含的AI引擎：**
- **KataGo v1.14.1** - 围棋AI（b6小模型，约15MB）
- **Pikafish** - 中国象棋AI（BMI2版本）
- **增强算法** - 五子棋AI（内置JavaScript实现）

---

## 快速开始

### 方法一：一键部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/fushengburumeng/myidea.git
cd myidea/weiqi

# 2. 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

部署脚本会自动：
- 检查并安装 Docker
- 构建包含AI引擎的镜像
- 启动容器
- 配置自动重启

### 方法二：使用 Docker Compose

```bash
# 1. 克隆项目
git clone https://github.com/fushengburumeng/myidea.git
cd myidea/weiqi

# 2. 启动服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f
```

---

## 详细部署步骤

### 1. 环境准备

#### 1.1 更新系统

```bash
sudo apt update
sudo apt upgrade -y
```

#### 1.2 安装 Docker

```bash
# 使用官方安装脚本
curl -fsSL https://get.docker.com | sh

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组（避免每次使用 sudo）
sudo usermod -aG docker $USER

# 重新登录以使组权限生效
exit
# 重新 SSH 登录
```

#### 1.3 验证 Docker 安装

```bash
docker --version
# 输出示例: Docker version 24.0.7, build afdd53b

docker run hello-world
# 应该看到 "Hello from Docker!" 消息
```

#### 1.4 安装 Docker Compose（可选）

```bash
# Ubuntu 24.04 可以直接安装插件
sudo apt install docker-compose-plugin

# 验证安装
docker compose version
# 输出示例: Docker Compose version v2.21.0
```

### 2. 获取项目代码

```bash
# 克隆仓库
git clone https://github.com/fushengburumeng/myidea.git

# 进入项目目录
cd myidea/weiqi

# 查看文件结构
ls -la
```

### 3. 构建 Docker 镜像

#### 3.1 理解 Dockerfile

项目使用**多阶段构建**，分为两个阶段：

**阶段1：下载器（downloader）**
- 基于 Alpine Linux
- 下载 KataGo 引擎和模型
- 下载 Pikafish 引擎
- 创建配置文件

**阶段2：应用（app）**
- 基于 Node.js 18 Alpine
- 安装运行时依赖
- 复制应用代码
- 从阶段1复制AI引擎

#### 3.2 构建镜像

```bash
# 构建镜像（首次构建需要5-10分钟）
docker build -t weiqi-game-platform .

# 查看镜像
docker images | grep weiqi
```

**预期输出：**
```
weiqi-game-platform   latest   abc123def456   2 minutes ago   450MB
```

#### 3.3 验证镜像内容

```bash
# 检查AI引擎文件
docker run --rm weiqi-game-platform ls -lh /app/ai/bin/katago/
docker run --rm weiqi-game-platform ls -lh /app/ai/bin/pikafish/
```

### 4. 启动容器

#### 4.1 使用 docker run

```bash
# 创建日志目录
mkdir -p logs

# 启动容器
docker run -d \
    -p 9527:9527 \
    --name weiqi-game-server \
    --restart=always \
    --memory=2g \
    --cpus=2 \
    -v "$(pwd)/logs:/app/logs" \
    weiqi-game-platform
```

**参数说明：**
- `-d`: 后台运行
- `-p 9527:9527`: 端口映射
- `--name`: 容器名称
- `--restart=always`: 自动重启
- `--memory=2g`: 内存限制2GB
- `--cpus=2`: CPU限制2核
- `-v`: 挂载日志目录

#### 4.2 使用 docker-compose

编辑 `docker-compose.yml`（已提供）：

```yaml
version: '3.8'

services:
  game-server:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: weiqi-game-server
    ports:
      - "9527:9527"
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=9527
    volumes:
      - ./logs:/app/logs
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

启动：

```bash
docker-compose up -d
```

### 5. 验证部署

#### 5.1 检查容器状态

```bash
# 查看运行中的容器
docker ps

# 查看容器详细信息
docker inspect weiqi-game-server
```

#### 5.2 查看日志

```bash
# 查看所有日志
docker logs weiqi-game-server

# 实时查看日志
docker logs -f weiqi-game-server

# 查看最近100行
docker logs --tail 100 weiqi-game-server

# 查看AI引擎状态
docker logs weiqi-game-server | grep -E "KataGo|Pikafish|AI引擎"
```

**预期日志输出：**
```
[EngineManager] KataGo可用: true /app/ai/bin/katago/katago
[EngineManager] Pikafish可用: true /app/ai/bin/pikafish/pikafish
游戏服务器运行在 http://localhost:9527
AI引擎状态: KataGo可用=true, Pikafish可用=true
```

#### 5.3 测试访问

```bash
# 获取服务器IP
hostname -I

# 测试HTTP访问
curl http://localhost:9527

# 或在浏览器访问
# http://your-server-ip:9527
```

#### 5.4 测试AI功能

1. 访问游戏大厅：`http://your-server-ip:9527`
2. 选择"围棋"或"中国象棋"
3. 点击"AI对弈"
4. 开始下棋，观察AI响应

---

## 容器管理

### 常用命令

```bash
# 查看容器状态
docker ps -a

# 启动容器
docker start weiqi-game-server

# 停止容器
docker stop weiqi-game-server

# 重启容器
docker restart weiqi-game-server

# 删除容器
docker rm weiqi-game-server

# 进入容器（调试用）
docker exec -it weiqi-game-server sh

# 查看容器资源使用
docker stats weiqi-game-server

# 查看容器日志
docker logs -f weiqi-game-server
```

### Docker Compose 命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps

# 重新构建并启动
docker-compose up -d --build
```

---

## 性能调优

### 1. 调整容器资源限制

```bash
# 修改内存限制为3GB
docker update --memory=3g weiqi-game-server

# 修改CPU限制为4核
docker update --cpus=4 weiqi-game-server
```

### 2. 调整AI引擎参数

#### 2.1 KataGo 性能调整

进入容器修改配置：

```bash
docker exec -it weiqi-game-server sh
cd /app/ai/bin/katago
vi config.cfg
```

修改参数：

```cfg
# 更快响应（降低棋力）
maxVisits = 50

# 更强棋力（增加响应时间）
maxVisits = 200

# 使用多线程（如果CPU核心充足）
numSearchThreads = 2
```

重启容器使配置生效：

```bash
docker restart weiqi-game-server
```

#### 2.2 Pikafish 性能调整

修改 `ai/pikafish-adapter.js`（需要重新构建镜像）：

```javascript
// 调整搜索深度
async getMove(fen, depth = 12) {  // 默认10，可调整为8-14
```

### 3. 启用日志轮转

创建 `docker-compose.yml` 日志配置：

```yaml
services:
  game-server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 监控与维护

### 1. 资源监控

```bash
# 实时监控容器资源
docker stats weiqi-game-server

# 查看容器进程
docker top weiqi-game-server

# 查看磁盘使用
docker system df
```

### 2. 健康检查

容器内置健康检查，每30秒检查一次：

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' weiqi-game-server

# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' weiqi-game-server | jq
```

### 3. 日志管理

```bash
# 查看日志文件大小
du -sh logs/

# 清理旧日志
find logs/ -name "*.log" -mtime +7 -delete

# 查看容器日志大小
docker inspect --format='{{.LogPath}}' weiqi-game-server | xargs ls -lh
```

### 4. 备份与恢复

#### 备份容器

```bash
# 导出镜像
docker save weiqi-game-platform > weiqi-image-backup.tar

# 导出容器数据
docker export weiqi-game-server > weiqi-container-backup.tar
```

#### 恢复容器

```bash
# 导入镜像
docker load < weiqi-image-backup.tar

# 启动容器
docker run -d -p 9527:9527 --name weiqi-game-server weiqi-game-platform
```

---

## 故障排查

### 1. 容器无法启动

**检查日志：**
```bash
docker logs weiqi-game-server
```

**常见问题：**

**问题1：端口被占用**
```
Error: bind: address already in use
```

解决方法：
```bash
# 查看占用端口的进程
sudo lsof -i :9527

# 停止占用端口的进程或更改端口
docker run -d -p 9528:9527 ...
```

**问题2：内存不足**
```
Cannot allocate memory
```

解决方法：
```bash
# 降低内存限制
docker run -d --memory=1g ...

# 或升级服务器内存
```

### 2. AI引擎不可用

**检查引擎文件：**
```bash
docker exec weiqi-game-server ls -lh /app/ai/bin/katago/
docker exec weiqi-game-server ls -lh /app/ai/bin/pikafish/
```

**测试引擎：**
```bash
# 测试 KataGo
docker exec weiqi-game-server sh -c "echo 'boardsize 9\nquit' | /app/ai/bin/katago/katago gtp -model /app/ai/bin/katago/b6.bin.gz -config /app/ai/bin/katago/config.cfg"

# 测试 Pikafish
docker exec weiqi-game-server sh -c "echo 'uci\nquit' | /app/ai/bin/pikafish/pikafish"
```

**重新构建镜像：**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 3. 性能问题

**检查资源使用：**
```bash
docker stats weiqi-game-server
```

**优化建议：**
1. 降低AI搜索深度
2. 增加容器内存限制
3. 使用SSD硬盘
4. 升级CPU

### 4. 网络问题

**检查容器网络：**
```bash
docker network ls
docker network inspect bridge
```

**测试容器网络：**
```bash
docker exec weiqi-game-server ping -c 3 google.com
```

---

## 更新与升级

### 1. 更新应用代码

```bash
# 拉取最新代码
cd myidea/weiqi
git pull origin master

# 重新构建并启动
docker-compose down
docker-compose up -d --build
```

### 2. 更新AI引擎

修改 `Dockerfile` 中的引擎版本，然后重新构建：

```dockerfile
# 例如更新 KataGo 到 v1.15.0
wget -q https://github.com/lightvector/KataGo/releases/download/v1.15.0/katago-v1.15.0-linux-x64.zip
```

### 3. 更新 Docker 镜像

```bash
# 删除旧镜像
docker rmi weiqi-game-platform

# 重新构建
docker build -t weiqi-game-platform .
```

---

## 安全建议

### 1. 防火墙配置

```bash
# 安装 UFW
sudo apt install ufw

# 允许 SSH
sudo ufw allow 22/tcp

# 允许游戏端口
sudo ufw allow 9527/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 2. 使用反向代理（可选）

使用 Nginx 作为反向代理：

```bash
# 安装 Nginx
sudo apt install nginx

# 配置反向代理
sudo nano /etc/nginx/sites-available/weiqi
```

配置内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:9527;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/weiqi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. 启用 HTTPS（可选）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 生产环境建议

### 1. 使用 Docker Swarm 或 Kubernetes

对于高可用部署，考虑使用容器编排工具。

### 2. 配置日志收集

使用 ELK Stack 或 Loki 收集日志。

### 3. 配置监控告警

使用 Prometheus + Grafana 监控容器。

### 4. 定期备份

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker save weiqi-game-platform > backup_${DATE}.tar
gzip backup_${DATE}.tar
EOF

chmod +x backup.sh

# 添加到 crontab（每天凌晨2点备份）
crontab -e
# 添加: 0 2 * * * /path/to/backup.sh
```

---

## 常见问题 FAQ

**Q: 首次构建需要多长时间？**
A: 约5-10分钟，主要时间用于下载AI引擎（约30MB）。

**Q: 镜像大小是多少？**
A: 约450MB，包含Node.js运行时、应用代码和AI引擎。

**Q: 可以在ARM架构上运行吗？**
A: 当前Dockerfile针对x86_64优化，ARM需要修改引擎下载链接。

**Q: 如何限制AI引擎的资源使用？**
A: 通过调整容器的 `--memory` 和 `--cpus` 参数，以及AI引擎的配置文件。

**Q: 支持多实例部署吗？**
A: 支持，修改端口映射即可：`-p 9528:9527`

**Q: 如何查看AI引擎的实时日志？**
A: `docker logs -f weiqi-game-server | grep -E "KataGo|Pikafish"`

---

## 联系与支持

- **项目地址**: https://github.com/fushengburumeng/myidea
- **问题反馈**: 提交 GitHub Issue
- **AI引擎文档**:
  - KataGo: https://github.com/lightvector/KataGo
  - Pikafish: https://github.com/official-pikafish/Pikafish

---

**部署完成！** 现在你的服务器已经通过Docker运行游戏平台和AI引擎了。

访问 `http://your-server-ip:9527` 开始游戏！
