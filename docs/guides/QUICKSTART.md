# 快速开始指南

## 🚀 快速部署（3步完成）

### 步骤1：下载AI引擎

```bash
# 赋予脚本执行权限
chmod +x download-ai-engines.sh

# 下载AI引擎文件（约100MB，需要5-10分钟）
./download-ai-engines.sh
```

### 步骤2：验证部署环境

```bash
# 赋予验证脚本执行权限
chmod +x verify-deployment.sh

# 运行验证脚本
./verify-deployment.sh
```

### 步骤3：正式部署

```bash
# 赋予部署脚本执行权限
chmod +x deploy.sh

# 部署到Docker
./scripts/deployment/deploy.sh
```

## 📋 详细说明

### 1. AI引擎下载

`download-ai-engines.sh` 会自动下载：
- **KataGo** (围棋引擎)
  - 可执行文件：katago-v1.15.3-eigenavx2-linux-x64
  - 神经网络模型：b6.bin.gz (约70MB)
- **Pikafish** (中国象棋引擎)
  - 可执行文件：pikafish-avx2

**下载位置：**
```
ai/bin/
├── katago/
│   ├── katago
│   └── b6.bin.gz
└── pikafish/
    └── pikafish
```

### 2. 部署验证

`verify-deployment.sh` 会检查：
- ✅ AI引擎文件是否存在
- ✅ Docker环境是否正常
- ✅ 项目文件是否完整
- ✅ Docker镜像构建是否成功
- ✅ 容器启动是否正常
- ✅ HTTP服务是否响应

### 3. 正式部署

`deploy.sh` 会执行：
1. 停止旧容器
2. 检查AI引擎文件
3. 构建Docker镜像（使用清华镜像源）
4. 创建日志目录
5. 启动新容器

## 🎮 访问游戏

部署成功后，访问：
```
http://localhost:9527
```

或者使用服务器IP：
```
http://your-server-ip:9527
```

## 📊 监控和管理

### 查看日志
```bash
# 实时查看日志
docker logs -f weiqi-game-server

# 查看AI引擎日志
docker logs weiqi-game-server 2>&1 | grep -E "KataGo|Pikafish|AI"
```

### 容器管理
```bash
# 重启服务
docker restart weiqi-game-server

# 停止服务
docker stop weiqi-game-server

# 进入容器
docker exec -it weiqi-game-server sh

# 查看容器状态
docker ps | grep weiqi
```

### 更新部署
```bash
# 拉取最新代码
git pull

# 重新部署
./scripts/deployment/deploy.sh
```

## 🔧 故障排查

### 问题1：AI引擎下载失败

**症状：** `download-ai-engines.sh` 下载超时或失败

**解决方案：**
```bash
# 方案1：使用代理
export https_proxy=http://your-proxy:port
./download-ai-engines.sh

# 方案2：手动下载
# 参考 ai/README.md 中的下载链接，手动下载后放到对应目录
```

### 问题2：Docker构建慢

**症状：** `docker build` 执行很慢

**解决方案：**
```bash
# 检查是否使用了清华镜像源
docker build -t test . --progress=plain 2>&1 | grep tsinghua

# 如果没有使用镜像源，检查Dockerfile配置
cat Dockerfile | grep tsinghua
```

### 问题3：容器启动失败

**症状：** 容器启动后立即退出

**解决方案：**
```bash
# 查看容器日志
docker logs weiqi-game-server

# 检查端口占用
netstat -tlnp | grep 9527

# 检查AI引擎文件
docker exec weiqi-game-server ls -lh /app/ai/bin/katago/
docker exec weiqi-game-server ls -lh /app/ai/bin/pikafish/
```

### 问题4：AI功能不可用

**症状：** 游戏可以玩，但AI对弈不工作

**解决方案：**
```bash
# 检查AI引擎状态
docker logs weiqi-game-server 2>&1 | grep -E "AI引擎|KataGo|Pikafish"

# 进入容器测试AI引擎
docker exec -it weiqi-game-server sh
/app/ai/bin/katago/katago version
echo "quit" | /app/ai/bin/pikafish/pikafish

# 检查AI引擎文件权限
docker exec weiqi-game-server ls -lh /app/ai/bin/katago/katago
docker exec weiqi-game-server ls -lh /app/ai/bin/pikafish/pikafish
```

## 📚 相关文档

- `DOCKER_OPTIMIZATION.md` - Docker优化详细说明
- `ai/README.md` - AI引擎安装指南
- `AI_IMPLEMENTATION.md` - AI引擎问题修复方案
- `CLAUDE.md` - 项目架构说明

## 🎯 性能优化建议

### 1. 服务器配置
- **最低配置**：2核CPU + 2GB内存
- **推荐配置**：4核CPU + 4GB内存
- **存储空间**：至少2GB可用空间

### 2. AI引擎性能调优

编辑 `ai/bin/katago/config.cfg`：
```cfg
# CPU较弱时，降低搜索次数
maxVisits = 50

# 多核CPU时，增加线程数
numSearchThreads = 2
```

### 3. Docker资源限制

编辑 `deploy.sh`：
```bash
docker run -d \
    --memory=4g \      # 增加内存限制
    --cpus=4 \         # 增加CPU限制
    ...
```

## 🔐 安全建议

1. **防火墙配置**
```bash
# 只允许特定IP访问
sudo ufw allow from your-ip to any port 9527
```

2. **反向代理**
```bash
# 使用Nginx反向代理，添加SSL
# 参考Nginx配置文档
```

3. **定期更新**
```bash
# 定期拉取最新代码
git pull
./scripts/deployment/deploy.sh
```

## 💡 提示

- 首次部署建议先运行 `verify-deployment.sh` 验证环境
- AI引擎文件较大，建议在网络良好时下载
- 使用清华镜像源可以显著加快构建速度
- 生产环境建议配置反向代理和SSL证书
