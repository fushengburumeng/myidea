# Docker 部署问题修复指南

## 问题现象

本地可以运行 AI 引擎，但 Docker 容器内报错：
- KataGo: `ENOENT` (文件不存在)
- Pikafish: `EACCES` (权限被拒绝)

---

## 🔍 问题诊断

### 在服务器上运行诊断脚本：

```bash
cd myidea/weiqi

# 1. 拉取最新代码
git pull origin master

# 2. 运行调试脚本
chmod +x debug-docker.sh
./debug-docker.sh
```

这个脚本会：
1. ✅ 检查本地 AI 引擎文件
2. ✅ 测试本地引擎是否可运行
3. ✅ 检查 .dockerignore 是否排除了 ai/ 目录
4. ✅ 构建测试镜像并检查文件
5. ✅ 显示可能的问题原因

---

## 🔧 解决方案

### 方案1：使用更新的 Dockerfile.local（推荐）

我已经更新了 `Dockerfile.local`，现在会：
- ✅ 显式复制 `ai/bin/katago` 和 `ai/bin/pikafish` 目录
- ✅ 自动设置执行权限
- ✅ 在构建时验证文件

**执行步骤：**

```bash
cd myidea/weiqi

# 1. 拉取最新代码
git pull origin master

# 2. 确保 AI 引擎文件存在且正确
./fix-engines.sh

# 3. 重新构建（会看到详细的验证信息）
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml build --no-cache

# 4. 启动
docker-compose -f docker-compose.local.yml up -d

# 5. 查看日志
docker logs -f weiqi-game-server
```

### 方案2：检查 .dockerignore

如果有 `.dockerignore` 文件，确保它没有排除 `ai/` 目录：

```bash
# 查看 .dockerignore
cat .dockerignore

# 如果看到 ai/ 或 ai/bin/，需要移除或注释掉
# 编辑 .dockerignore，删除或注释这些行：
# ai/
# ai/bin/
# *.bin.gz
```

### 方案3：手动验证构建

```bash
# 1. 构建镜像（查看详细输出）
docker build -f Dockerfile.local -t weiqi-test --progress=plain .

# 2. 检查构建的镜像
docker run --rm weiqi-test sh -c "ls -lh /app/ai/bin/katago/ && ls -lh /app/ai/bin/pikafish/"

# 3. 测试引擎
docker run --rm weiqi-test sh -c "/app/ai/bin/katago/katago version"
docker run --rm weiqi-test sh -c "echo 'uci' | /app/ai/bin/pikafish/pikafish"
```

---

## 📋 构建时应该看到的输出

正确的构建输出应该包含：

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
```

---

## ✅ 验证修复

启动后，查看日志应该看到：

```bash
docker logs weiqi-game-server | grep -E "KataGo|Pikafish|AI引擎"
```

**预期输出：**
```
[EngineManager] KataGo可用: true /app/ai/bin/katago/katago
[EngineManager] Pikafish可用: true /app/ai/bin/pikafish/pikafish
AI引擎状态: KataGo可用=true, Pikafish可用=true
```

---

## 🐛 常见问题

### Q1: 构建时看到 "警告: KataGo 未找到"

**原因**: `ai/bin/` 目录没有被复制到 Docker 镜像中

**解决**:
1. 检查 `.dockerignore` 是否排除了 `ai/`
2. 确保本地 `ai/bin/katago/katago` 文件存在
3. 使用 `--no-cache` 重新构建

### Q2: 容器内文件存在但无法执行

**原因**: 权限问题或缺少依赖库

**解决**:
```bash
# 进入容器检查
docker exec -it weiqi-game-server sh

# 检查文件权限
ls -l /app/ai/bin/katago/katago
ls -l /app/ai/bin/pikafish/pikafish

# 检查依赖库
ldd /app/ai/bin/katago/katago
ldd /app/ai/bin/pikafish/pikafish

# 手动设置权限
chmod +x /app/ai/bin/katago/katago
chmod +x /app/ai/bin/pikafish/pikafish
```

### Q3: COPY 命令失败

**错误**: `COPY failed: file not found`

**原因**: 本地文件不存在或路径错误

**解决**:
```bash
# 检查本地文件
ls -lh ai/bin/katago/katago
ls -lh ai/bin/pikafish/pikafish

# 如果不存在，运行
./fix-engines.sh
```

### Q4: Alpine Linux 缺少依赖

**错误**: 引擎启动时报 "not found" 或 "cannot execute"

**解决**: 确保 Dockerfile 包含：
```dockerfile
RUN apk add --no-cache libstdc++ libgomp
```

---

## 📝 完整的修复流程

```bash
# 1. 进入项目目录
cd myidea/weiqi

# 2. 拉取最新代码
git pull origin master

# 3. 修复引擎文件名和权限
chmod +x fix-engines.sh
./fix-engines.sh

# 4. 验证本地文件
ls -lh ai/bin/katago/katago
ls -lh ai/bin/pikafish/pikafish

# 5. 测试本地引擎
./ai/bin/katago/katago version
echo "uci" | ./ai/bin/pikafish/pikafish

# 6. 停止旧容器
docker-compose -f docker-compose.local.yml down

# 7. 清理旧镜像（可选）
docker rmi weiqi-game-platform

# 8. 重新构建（不使用缓存）
docker-compose -f docker-compose.local.yml build --no-cache

# 9. 启动
docker-compose -f docker-compose.local.yml up -d

# 10. 查看日志
docker logs -f weiqi-game-server

# 11. 验证 AI 引擎
docker logs weiqi-game-server | grep -E "KataGo|Pikafish|AI引擎"
```

---

## 🎯 成功标志

修复成功后，你应该能够：

1. ✅ Docker 日志显示 AI 引擎可用
2. ✅ 访问 `http://your-server-ip:9527`
3. ✅ 选择围棋 → AI对弈
4. ✅ 下棋后 AI 在 2-5 秒内响应

---

## 📞 仍然有问题？

请提供以下信息：

```bash
# 1. 本地文件检查
ls -lh ai/bin/katago/
ls -lh ai/bin/pikafish/

# 2. Docker 构建输出
docker build -f Dockerfile.local -t weiqi-test --progress=plain . 2>&1 | grep -E "ai/bin|katago|pikafish|警告|错误"

# 3. 容器内文件检查
docker run --rm weiqi-test sh -c "ls -lh /app/ai/bin/katago/ && ls -lh /app/ai/bin/pikafish/"

# 4. 完整日志
docker logs weiqi-game-server
```
