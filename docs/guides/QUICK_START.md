# 🚀 Ubuntu 24.04 Docker 快速部署指南

## 推荐方案：本地下载 + Docker构建

由于GitHub下载可能不稳定，**强烈推荐**先在本地下载AI引擎，然后构建Docker镜像。

---

## 📋 快速开始（3步完成）

### 步骤1：下载AI引擎

```bash
# 克隆项目
git clone https://github.com/fushengburumeng/myidea.git
cd myidea/weiqi

# 运行下载脚本
chmod +x scripts/deployment/download-engines.sh
./scripts/deployment/download-engines.sh
```

**脚本会自动：**
- ✅ 尝试多个KataGo版本（v1.15.3, v1.15.0, v1.14.0）
- ✅ 失败时自动切换到镜像源
- ✅ 下载Pikafish引擎
- ✅ 创建配置文件
- ✅ 测试引擎是否正常

**预期输出：**
```
==========================================
   AI引擎下载脚本
==========================================

[1/4] 下载 KataGo...
✓ 从GitHub下载 v1.15.3 成功
✓ KataGo 下载完成

[2/4] 下载 KataGo 模型 (b6, ~15MB)...
✓ 从GitHub下载成功
✓ 模型下载完成

[3/4] 创建 KataGo 配置...
✓ 配置文件已创建

[4/4] 下载 Pikafish...
✓ 从GitHub下载成功
✓ Pikafish 下载完成

==========================================
   测试引擎
==========================================
✓ KataGo 测试通过
✓ Pikafish 测试通过

==========================================
   下载完成！
==========================================
```

### 步骤2：构建Docker镜像

```bash
# 使用本地引擎构建
docker build -f Dockerfile.local -t weiqi-game-platform .
```

**构建时间：** 约2-3分钟（不需要下载引擎）

### 步骤3：启动服务

**方式A：使用Docker Compose（推荐）**

```bash
docker-compose -f docker/docker-compose.local.yml up -d
```

**方式B：使用docker run**

```bash
docker run -d \
    -p 9527:9527 \
    --name weiqi-game-server \
    --restart=always \
    --memory=2g \
    --cpus=2 \
    weiqi-game-platform
```

### 步骤4：验证部署

```bash
# 查看容器状态
docker ps | grep weiqi

# 查看日志
docker logs -f weiqi-game-server

# 查看AI引擎状态
docker logs weiqi-game-server | grep -E "KataGo|Pikafish|AI引擎"
```

**预期日志：**
```
[EngineManager] KataGo可用: true /app/ai/bin/katago/katago
[EngineManager] Pikafish可用: true /app/ai/bin/pikafish/pikafish
游戏服务器运行在 http://localhost:9527
AI引擎状态: KataGo可用=true, Pikafish可用=true
```

### 步骤5：访问游戏

```bash
# 获取服务器IP
hostname -I
```

浏览器访问：`http://your-server-ip:9527`

---

## 🔧 备选方案

### 方案1：如果下载脚本失败

**手动下载引擎：**

1. **下载KataGo：**
   - 访问：https://github.com/lightvector/KataGo/releases
   - 下载：`katago-v1.15.3-linux-x64.zip`（或其他版本）
   - 解压到：`ai/bin/katago/`

2. **下载KataGo模型：**
   - 访问：https://github.com/lightvector/KataGo/releases/tag/v1.4.5
   - 下载：`g170e-b6c96-s175395328-d26788732.bin.gz`
   - 重命名为：`b6.bin.gz`
   - 放到：`ai/bin/katago/`

3. **下载Pikafish：**
   - 访问：https://github.com/official-pikafish/Pikafish/releases
   - 下载：`pikafish-bmi2`
   - 重命名为：`pikafish`
   - 放到：`ai/bin/pikafish/`

4. **创建配置文件：**
```bash
cat > ai/bin/katago/config.cfg << 'EOF'
logSearchInfo = false
logToStderr = false
maxVisits = 100
numSearchThreads = 1
EOF
```

5. **添加执行权限：**
```bash
chmod +x ai/bin/katago/katago
chmod +x ai/bin/pikafish/pikafish
```

6. **构建镜像：**
```bash
docker build -f Dockerfile.local -t weiqi-game-platform .
```

### 方案2：使用在线构建（如果网络良好）

```bash
# 直接构建（会在Docker内下载引擎）
docker build -t weiqi-game-platform .

# 启动
docker run -d -p 9527:9527 --name weiqi-game-server weiqi-game-platform
```

**注意：** 这种方式需要Docker构建时能访问GitHub，可能会失败。

### 方案3：使用镜像加速

```bash
# 使用带镜像的Dockerfile
docker build -f Dockerfile.mirror -t weiqi-game-platform .
```

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

# 删除容器
docker rm -f weiqi-game-server

# 进入容器
docker exec -it weiqi-game-server sh

# 查看资源使用
docker stats weiqi-game-server
```

### Docker Compose

```bash
# 启动
docker-compose -f docker/docker-compose.local.yml up -d

# 停止
docker-compose -f docker/docker-compose.local.yml down

# 重启
docker-compose -f docker/docker-compose.local.yml restart

# 查看日志
docker-compose -f docker/docker-compose.local.yml logs -f

# 重新构建
docker-compose -f docker/docker-compose.local.yml up -d --build
```

---

## 🐛 故障排查

### 问题1：下载脚本失败

**症状：**
```
✗ 下载失败，请手动下载
```

**解决：**
1. 检查网络连接：`ping github.com`
2. 使用代理或VPN
3. 手动下载（见备选方案1）

### 问题2：Docker构建失败

**症状：**
```
ERROR: failed to solve
```

**解决：**
```bash
# 清理Docker缓存
docker system prune -a

# 重新构建
docker build -f Dockerfile.local -t weiqi-game-platform . --no-cache
```

### 问题3：容器启动失败

**症状：**
```
docker ps 看不到容器
```

**解决：**
```bash
# 查看错误日志
docker logs weiqi-game-server

# 检查端口占用
sudo lsof -i :9527

# 更换端口
docker run -d -p 9528:9527 ...
```

### 问题4：AI引擎不可用

**症状：**
```
[EngineManager] KataGo可用: false
```

**解决：**
```bash
# 检查引擎文件
docker exec weiqi-game-server ls -lh /app/ai/bin/katago/
docker exec weiqi-game-server ls -lh /app/ai/bin/pikafish/

# 测试引擎
docker exec weiqi-game-server /app/ai/bin/katago/katago version
docker exec weiqi-game-server /app/ai/bin/pikafish/pikafish --version

# 重新构建
docker-compose -f docker/docker-compose.local.yml down
docker-compose -f docker/docker-compose.local.yml up -d --build
```

---

## ⚙️ 性能调优

### 调整AI搜索深度

**KataGo（围棋）：**
```bash
# 进入容器
docker exec -it weiqi-game-server sh

# 编辑配置
vi /app/ai/bin/katago/config.cfg

# 修改 maxVisits
# 50  = 更快（1-2秒）
# 100 = 平衡（2-5秒）默认
# 200 = 更强（5-10秒）

# 退出并重启
exit
docker restart weiqi-game-server
```

**Pikafish（象棋）：**

需要修改代码并重新构建：
```javascript
// ai/pikafish-adapter.js
async getMove(fen, depth = 10) {  // 改为 8-12
```

### 调整容器资源

```bash
# 增加内存
docker update --memory=3g weiqi-game-server

# 增加CPU
docker update --cpus=4 weiqi-game-server
```

---

## 📈 监控

```bash
# 实时监控资源
docker stats weiqi-game-server

# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' weiqi-game-server

# 查看容器进程
docker top weiqi-game-server
```

---

## 🔄 更新部署

```bash
# 拉取最新代码
cd myidea/weiqi
git pull origin master

# 重新下载引擎（如果有更新）
./scripts/deployment/download-engines.sh

# 重新构建并启动
docker-compose -f docker/docker-compose.local.yml down
docker-compose -f docker/docker-compose.local.yml up -d --build
```

---

## 📚 文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 在线构建（Docker内下载引擎） |
| `Dockerfile.local` | 本地构建（使用本地引擎）**推荐** |
| `Dockerfile.mirror` | 镜像加速构建 |
| `docker-compose.yml` | 在线构建配置 |
| `docker/docker-compose.local.yml` | 本地构建配置 **推荐** |
| `download-engines.sh` | 引擎下载脚本 |

---

## ✅ 检查清单

部署前：
- [ ] 已安装Docker
- [ ] 已克隆项目
- [ ] 已运行 `download-engines.sh`
- [ ] 引擎文件存在于 `ai/bin/` 目录

部署后：
- [ ] 容器正常运行（`docker ps`）
- [ ] AI引擎可用（查看日志）
- [ ] 可以访问 `http://server-ip:9527`
- [ ] AI对弈功能正常

---

## 🆘 获取帮助

如果遇到问题：

1. **查看详细文档：**
   - `DOCKER_DEPLOYMENT.md` - 完整部署指南
   - `DOCKER_TROUBLESHOOTING.md` - 故障排查

2. **查看日志：**
   ```bash
   docker logs -f weiqi-game-server
   ```

3. **提交Issue：**
   https://github.com/fushengburumeng/myidea/issues

---

## 🎉 完成！

现在你的Ubuntu 24.04服务器已经成功部署了围棋游戏平台和AI引擎！

**访问地址：** `http://your-server-ip:9527`

**测试AI功能：**
1. 选择"围棋"或"中国象棋"
2. 点击"AI对弈"
3. 开始下棋，观察AI响应

**预期性能：**
- 围棋AI：2-5秒响应，业余高段水平
- 象棋AI：<1秒响应，专业级水平
- 五子棋AI：<0.5秒响应，业余高手水平

祝你游戏愉快！🎮
