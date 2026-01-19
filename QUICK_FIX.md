# 🎯 快速参考卡片

## 问题：Docker 容器内 AI 引擎无法运行

### 原因
文件名不匹配：
- 下载的：`katago-v1.15.3-eigenavx2-linux-x64+bs50`
- 期望的：`katago`

---

## ✅ 一键修复（在服务器上执行）

```bash
cd myidea/weiqi
git pull origin master
chmod +x deploy-fix.sh
./deploy-fix.sh
```

---

## 📋 脚本说明

| 脚本 | 用途 | 何时使用 |
|------|------|----------|
| **deploy-fix.sh** ⭐ | 完整修复和部署 | 首次修复问题 |
| **fix-engines.sh** | 只修复引擎文件 | 引擎文件名错误 |
| **debug-docker.sh** | 诊断 Docker 问题 | 构建失败时 |
| **update.sh** | 更新代码 | 以后更新代码 |

---

## 🔍 验证成功

```bash
# 查看日志
docker logs weiqi-game-server | grep -E "KataGo|Pikafish|AI引擎"

# 应该看到：
# [EngineManager] KataGo可用: true
# [EngineManager] Pikafish可用: true
# AI引擎状态: KataGo可用=true, Pikafish可用=true
```

---

## 🎮 测试

1. 访问：`http://your-server-ip:9527`
2. 选择：围棋 → AI对弈
3. 下棋 → AI 应在 2-5 秒响应

---

## 📚 详细文档

- **SERVER_GUIDE.md** - 服务器操作指南
- **DOCKER_FIX_GUIDE.md** - Docker 修复详解
- **FIX_AI_ENGINES.md** - 引擎修复说明

---

## 🆘 还有问题？

```bash
# 运行调试脚本
./debug-docker.sh

# 查看完整日志
docker logs weiqi-game-server

# 检查本地文件
ls -lh ai/bin/katago/
ls -lh ai/bin/pikafish/
```
