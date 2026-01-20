# 🚀 服务器端快速操作指南

## 当前问题

本地可以运行 AI 引擎，但 Docker 容器内无法运行。

---

## ✅ 一键修复（推荐）

我已经为你准备好了完整的修复脚本。

### 在服务器上执行：

```bash
# 1. 进入项目目录
cd myidea/weiqi

# 2. 拉取最新代码（包含所有修复）
git pull origin master

# 3. 运行一键修复脚本
chmod +x deploy-fix.sh
./deploy-fix.sh
```

**这个脚本会自动完成：**
1. ✅ 检查 AI 引擎文件
2. ✅ 修复文件名（katago-v1.15.3-eigenavx2-linux-x64+bs50 → katago）
3. ✅ 修复文件名（pikafish-avx2 → pikafish）
4. ✅ 设置执行权限
5. ✅ 测试本地引擎
6. ✅ 停止旧容器
7. ✅ 重新构建 Docker 镜像（不使用缓存）
8. ✅ 启动服务
9. ✅ 验证 AI 引擎状态

---

## 📋 手动修复步骤（如果脚本失败）

### 步骤1：拉取最新代码

```bash
cd myidea/weiqi
git pull origin master
```

### 步骤2：修复引擎文件

```bash
chmod +x fix-engines.sh
./fix-engines.sh
```

### 步骤3：验证本地文件

```bash
# 应该看到 katago 和 pikafish 文件
ls -lh ai/bin/katago/katago
ls -lh ai/bin/pikafish/pikafish

# 测试引擎
./ai/bin/katago/katago version
echo "uci" | ./ai/bin/pikafish/pikafish
```

### 步骤4：重新构建 Docker

```bash
# 停止旧容器
docker-compose -f docker/docker-compose.local.yml down

# 重新构建（不使用缓存）
docker-compose -f docker/docker-compose.local.yml build --no-cache

# 启动
docker-compose -f docker/docker-compose.local.yml up -d
```

### 步骤5：查看日志

```bash
# 查看完整日志
docker logs -f weiqi-game-server

# 或只看 AI 相关日志
docker logs weiqi-game-server | grep -E "KataGo|Pikafish|AI引擎"
```

---

## 🎯 成功标志

修复成功后，日志应该显示：

```
========== AI 引擎文件验证 ==========
KataGo 目录:
total 300M
-rwxr-xr-x    1 root     root      177.2M Jan 19 03:28 katago
-rw-r--r--    1 root     root       83.3M Jan 19 05:22 b6.bin.gz
-rw-r--r--    1 root     root         124 Jan 19 05:24 config.cfg

Pikafish 目录:
total 12M
-rwxr-xr-x    1 root     root       12.0M Jan 19 05:27 pikafish

检查可执行文件:
✓ KataGo 可执行
✓ Pikafish 可执行
=====================================

[EngineManager] KataGo可用: true /app/ai/bin/katago/katago
[EngineManager] Pikafish可用: true /app/ai/bin/pikafish/pikafish
AI引擎状态: KataGo可用=true, Pikafish可用=true
```

---

## 🔍 调试工具

如果还有问题，使用调试脚本：

```bash
chmod +x debug-docker.sh
./debug-docker.sh
```

这会显示：
- 本地文件状态
- 本地引擎测试结果
- .dockerignore 检查
- Docker 构建过程
- 容器内文件状态

---

## 📝 我为你创建的文件

### 1. **deploy-fix.sh** ⭐ - 一键修复脚本
完整的自动化修复和部署流程

### 2. **fix-engines.sh** - 引擎文件修复
修复文件名和权限问题

### 3. **debug-docker.sh** - Docker 调试工具
诊断 Docker 构建问题

### 4. **update.sh** - 代码更新脚本
以后更新代码使用

### 5. **Dockerfile.local** - 更新的 Dockerfile
显式复制 AI 引擎文件，带验证

### 6. **DOCKER_FIX_GUIDE.md** - 详细修复文档
完整的故障排查指南

---

## 🔄 以后更新代码

```bash
cd myidea/weiqi

# 方式1：使用更新脚本
./update.sh

# 方式2：手动更新
git pull origin master
docker-compose -f docker/docker-compose.local.yml up -d --build
```

---

## ⚠️ 重要提示

### 文件名问题的根源

你的 `download-engines.sh` 下载的文件名是：
- `katago-v1.15.3-eigenavx2-linux-x64+bs50`
- `pikafish-avx2`

但代码期望的文件名是：
- `katago`
- `pikafish`

**解决方案：**
1. 使用 `fix-engines.sh` 自动重命名
2. 或修改 `download-engines.sh` 在下载后自动重命名

---

## 📞 如果还有问题

请提供以下信息：

```bash
# 1. 本地文件检查
ls -lh ai/bin/katago/
ls -lh ai/bin/pikafish/

# 2. 本地引擎测试
./ai/bin/katago/katago version
echo "uci" | ./ai/bin/pikafish/pikafish

# 3. Docker 构建输出
docker build -f Dockerfile.local -t weiqi-test --progress=plain . 2>&1 | tail -50

# 4. 容器内文件检查
docker run --rm weiqi-test sh -c "ls -lh /app/ai/bin/katago/ && ls -lh /app/ai/bin/pikafish/"

# 5. 完整日志
docker logs weiqi-game-server
```

---

## 🎮 测试 AI 功能

修复完成后：

1. 访问：`http://your-server-ip:9527`
2. 选择：**围棋** → **AI对弈**
3. 下一步棋
4. AI 应该在 2-5 秒内响应

---

**现在去服务器上运行 `./deploy-fix.sh` 吧！** 🚀
