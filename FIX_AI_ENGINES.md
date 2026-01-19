# AI引擎问题修复指南

## 问题诊断

根据日志，发现两个问题：

### 1. KataGo 错误
```
Error: spawn /app/ai/bin/katago/katago ENOENT
```
**原因**: 文件名不匹配。`download-engines.sh` 下载的是 `katago-v1.15.3-eigenavx2-linux-x64+bs50`，但代码期望的是 `katago`

### 2. Pikafish 错误
```
Error: spawn /app/ai/bin/pikafish/pikafish EACCES
```
**原因**:
- 文件名不匹配（下载的是 `pikafish-avx2`，期望的是 `pikafish`）
- 或者权限问题

---

## 🔧 快速修复步骤

### 在服务器上执行以下命令：

```bash
# 1. 进入项目目录
cd myidea/weiqi

# 2. 拉取最新代码（包含修复脚本）
git pull origin master

# 3. 运行修复脚本
chmod +x fix-engines.sh
./fix-engines.sh

# 4. 重新构建并启动
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d --build

# 5. 查看日志确认
docker logs -f weiqi-game-server
```

---

## 📋 修复脚本说明

### `fix-engines.sh` 会自动：
1. ✅ 检查 `ai/bin/katago/` 目录
2. ✅ 将 `katago-v1.15.3-eigenavx2-linux-x64+bs50` 重命名为 `katago`
3. ✅ 检查 `ai/bin/pikafish/` 目录
4. ✅ 将 `pikafish-avx2` 重命名为 `pikafish`
5. ✅ 添加执行权限
6. ✅ 测试引擎是否可以运行

---

## 🔍 手动修复（如果脚本失败）

### 修复 KataGo：
```bash
cd ai/bin/katago

# 查看当前文件
ls -lh

# 如果看到 katago-v1.15.3-eigenavx2-linux-x64+bs50
mv katago-v1.15.3-eigenavx2-linux-x64+bs50 katago
chmod +x katago

# 测试
./katago version
```

### 修复 Pikafish：
```bash
cd ai/bin/pikafish

# 查看当前文件
ls -lh

# 如果看到 pikafish-avx2
mv pikafish-avx2 pikafish
chmod +x pikafish

# 测试
echo "uci" | ./pikafish
```

---

## ✅ 验证修复

运行以下命令验证：

```bash
# 1. 检查文件存在且有执行权限
ls -lh ai/bin/katago/katago
ls -lh ai/bin/pikafish/pikafish

# 2. 测试 KataGo
./ai/bin/katago/katago version

# 3. 测试 Pikafish
echo "uci" | ./ai/bin/pikafish/pikafish

# 4. 重新构建 Docker
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d --build

# 5. 查看日志（应该看到 "AI引擎状态: KataGo可用=true, Pikafish可用=true"）
docker logs weiqi-game-server | grep -E "KataGo|Pikafish|AI引擎"
```

---

## 📝 预期的正确日志

修复后，你应该看到：

```
[EngineManager] KataGo可用: true /app/ai/bin/katago/katago
[EngineManager] Pikafish可用: true /app/ai/bin/pikafish/pikafish
游戏服务器运行在 http://localhost:9527
AI引擎状态: KataGo可用=true, Pikafish可用=true
```

---

## 🚀 以后更新代码

使用 `update.sh` 脚本：

```bash
# 一键更新
chmod +x update.sh
./update.sh
```

这个脚本会：
1. 拉取最新代码
2. 检查 AI 引擎文件
3. 重新构建并启动 Docker 容器
4. 显示日志

---

## ❓ 常见问题

### Q: 为什么会出现文件名不匹配？
A: `download-engines.sh` 下载的是完整文件名（如 `katago-v1.15.3-eigenavx2-linux-x64+bs50`），但之前的脚本版本会自动重命名。你更新的脚本版本可能缺少重命名步骤。

### Q: 如果 fix-engines.sh 运行后还是有问题？
A:
1. 检查文件是否真的存在：`ls -lh ai/bin/katago/ ai/bin/pikafish/`
2. 检查权限：`ls -l ai/bin/katago/katago ai/bin/pikafish/pikafish`
3. 尝试手动运行引擎看错误信息
4. 如果还是不行，重新运行 `./download-engines.sh`

### Q: Docker 容器里看到文件但无法执行？
A: 可能是 Alpine Linux 缺少依赖库。检查 Dockerfile.local 是否包含：
```dockerfile
RUN apk add --no-cache libstdc++ libgomp
```

---

## 📞 需要帮助？

如果问题仍未解决，请提供：
1. `ls -lh ai/bin/katago/` 的输出
2. `ls -lh ai/bin/pikafish/` 的输出
3. `./ai/bin/katago/katago version` 的输出
4. `docker logs weiqi-game-server` 的最新日志
