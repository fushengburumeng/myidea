# 围棋游戏平台 - Docker 快速部署指南

## 🚀 快速开始（Ubuntu 24.04 LTS）

### 一键部署

```bash
# 1. 克隆项目
git clone https://github.com/fushengburumeng/myidea.git
cd myidea/weiqi

# 2. 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

等待5-10分钟，部署完成后访问：`http://your-server-ip:9527`

---

## 📋 部署方式对比

| 方式 | 优点 | 适用场景 |
|------|------|----------|
| **deploy.sh** | 全自动，一键完成 | 快速部署、生产环境 |
| **docker-compose** | 配置灵活，易管理 | 开发环境、多服务 |
| **手动构建** | 完全控制 | 自定义需求 |

---

## 📦 包含的内容

### AI引擎（自动下载）
- ✅ **KataGo v1.14.1** - 围棋AI（b6模型，15MB）
- ✅ **Pikafish** - 中国象棋AI（BMI2版本）
- ✅ **增强算法** - 五子棋AI（内置）

### 容器配置
- **基础镜像**: Node.js 18 Alpine
- **镜像大小**: ~450MB
- **内存限制**: 2GB
- **CPU限制**: 2核
- **端口**: 9527

---

## 🛠️ 部署方法

### 方法一：使用 deploy.sh（推荐）

```bash
# 克隆并部署
git clone https://github.com/fushengburumeng/myidea.git
cd myidea/weiqi
chmod +x deploy.sh
./deploy.sh
```

**脚本功能：**
- ✅ 自动检查并安装 Docker
- ✅ 构建包含AI引擎的镜像
- ✅ 启动容器并配置自动重启
- ✅ 验证部署状态

### 方法二：使用 Docker Compose

```bash
# 克隆项目
git clone https://github.com/fushengburumeng/myidea.git
cd myidea/weiqi

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 方法三：手动构建

```bash
# 1. 构建镜像
docker build -t weiqi-game-platform .

# 2. 启动容器
docker run -d \
    -p 9527:9527 \
    --name weiqi-game-server \
    --restart=always \
    --memory=2g \
    --cpus=2 \
    weiqi-game-platform

# 3. 查看日志
docker logs -f weiqi-game-server
```

---

## ✅ 验证部署

### 1. 检查容器状态

```bash
docker ps | grep weiqi
```

**预期输出：**
```
CONTAINER ID   IMAGE                  STATUS         PORTS
abc123def456   weiqi-game-platform   Up 2 minutes   0.0.0.0:9527->9527/tcp
```

### 2. 查看AI引擎状态

```bash
docker logs weiqi-game-server | grep -E "KataGo|Pikafish|AI引擎"
```

**预期输出：**
```
[EngineManager] KataGo可用: true
[EngineManager] Pikafish可用: true
AI引擎状态: KataGo可用=true, Pikafish可用=true
```

### 3. 测试访问

```bash
# 获取服务器IP
hostname -I

# 测试HTTP
curl http://localhost:9527
```

浏览器访问：`http://your-server-ip:9527`

---

## 🎮 测试AI功能

1. 访问游戏大厅：`http://your-server-ip:9527`
2. 选择游戏：
   - **围棋** → 点击"AI对弈" → 开始下棋
   - **中国象棋** → 点击"AI对弈" → 开始下棋
   - **五子棋** → 点击"AI对弈" → 开始下棋
3. 观察AI响应时间：
   - 围棋：2-5秒
   - 象棋：<1秒
   - 五子棋：<0.5秒

---

## 📊 常用命令

### 容器管理

```bash
# 查看日志
docker logs -f weiqi-game-server

# 查看AI状态
docker logs weiqi-game-server | grep -E "KataGo|Pikafish"

# 重启服务
docker restart weiqi-game-server

# 停止服务
docker stop weiqi-game-server

# 进入容器
docker exec -it weiqi-game-server sh

# 查看资源使用
docker stats weiqi-game-server
```

### Docker Compose

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 重启
docker-compose restart

# 查看日志
docker-compose logs -f

# 重新构建
docker-compose up -d --build
```

---

## ⚙️ 性能调优

### 调整AI引擎参数

#### KataGo（围棋）

```bash
# 进入容器
docker exec -it weiqi-game-server sh

# 编辑配置
vi /app/ai/bin/katago/config.cfg
```

修改 `maxVisits` 参数：
- `50` - 更快响应（1-2秒），业余初段
- `100` - 平衡（2-5秒），业余高段（默认）
- `200` - 更强棋力（5-10秒），接近职业

```bash
# 重启容器使配置生效
exit
docker restart weiqi-game-server
```

#### Pikafish（象棋）

修改搜索深度需要重新构建镜像。编辑 `ai/pikafish-adapter.js`:

```javascript
async getMove(fen, depth = 10) {  // 8-12，越大越强
```

### 调整容器资源

```bash
# 增加内存到3GB
docker update --memory=3g weiqi-game-server

# 增加CPU到4核
docker update --cpus=4 weiqi-game-server
```

---

## 🔧 故障排查

### 问题1：容器无法启动

```bash
# 查看错误日志
docker logs weiqi-game-server

# 检查端口占用
sudo lsof -i :9527

# 更换端口
docker run -d -p 9528:9527 ...
```

### 问题2：AI引擎不可用

```bash
# 检查引擎文件
docker exec weiqi-game-server ls -lh /app/ai/bin/katago/
docker exec weiqi-game-server ls -lh /app/ai/bin/pikafish/

# 测试KataGo
docker exec weiqi-game-server sh -c \
  "echo 'boardsize 9\nquit' | /app/ai/bin/katago/katago gtp -model /app/ai/bin/katago/b6.bin.gz -config /app/ai/bin/katago/config.cfg"

# 重新构建镜像
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 问题3：性能慢

```bash
# 查看资源使用
docker stats weiqi-game-server

# 降低AI搜索深度（见性能调优）
# 或增加容器资源限制
```

---

## 🔄 更新部署

```bash
# 拉取最新代码
cd myidea/weiqi
git pull origin master

# 重新部署
./deploy.sh

# 或使用 Docker Compose
docker-compose down
docker-compose up -d --build
```

---

## 🔒 安全建议

### 配置防火墙

```bash
# 安装UFW
sudo apt install ufw

# 允许SSH和游戏端口
sudo ufw allow 22/tcp
sudo ufw allow 9527/tcp

# 启用防火墙
sudo ufw enable
```

### 使用Nginx反向代理（可选）

```bash
# 安装Nginx
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
    }
}
```

启用：
```bash
sudo ln -s /etc/nginx/sites-available/weiqi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📈 监控

### 查看资源使用

```bash
# 实时监控
docker stats weiqi-game-server

# 查看容器进程
docker top weiqi-game-server
```

### 健康检查

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' weiqi-game-server
```

---

## 💾 备份

```bash
# 导出镜像
docker save weiqi-game-platform > weiqi-backup.tar

# 压缩
gzip weiqi-backup.tar

# 恢复
docker load < weiqi-backup.tar.gz
```

---

## ❓ 常见问题

**Q: 首次构建需要多长时间？**
A: 约5-10分钟，主要用于下载AI引擎（~30MB）。

**Q: 镜像大小是多少？**
A: 约450MB，包含Node.js、应用代码和AI引擎。

**Q: 内存占用多少？**
A: 空闲时约100MB，AI运行时峰值约500-700MB。

**Q: 支持多实例吗？**
A: 支持，修改端口映射：`-p 9528:9527`

**Q: 如何查看AI日志？**
A: `docker logs -f weiqi-game-server | grep -E "KataGo|Pikafish"`

---

## 📚 相关文档

- **详细部署文档**: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- **AI实现文档**: [AI_IMPLEMENTATION.md](./AI_IMPLEMENTATION.md)
- **通用部署文档**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **项目说明**: [CLAUDE.md](./CLAUDE.md)

---

## 🆘 获取帮助

- **GitHub Issues**: https://github.com/fushengburumeng/myidea/issues
- **KataGo文档**: https://github.com/lightvector/KataGo
- **Pikafish文档**: https://github.com/official-pikafish/Pikafish

---

**部署完成！** 🎉

访问 `http://your-server-ip:9527` 开始游戏！
