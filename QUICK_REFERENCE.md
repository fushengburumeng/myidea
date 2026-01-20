# 围棋游戏平台 - 快速参考

> 项目结构已优化，所有文件已重新组织。请参考本文档快速上手。

## 📂 新的项目结构

```
weiqi/
├── ai/                    # AI引擎模块
├── docker/                # Docker配置
├── docs/                  # 项目文档
│   ├── guides/           # 使用指南
│   └── reports/          # 技术报告
├── legacy/                # 废弃代码（旧版）
├── public/                # 前端代码
├── scripts/               # 脚本工具
│   ├── deployment/       # 部署脚本
│   └── maintenance/      # 维护脚本
├── server.js              # 主服务器
└── PROJECT_STRUCTURE.md   # 项目结构规范
```

## 🚀 快速开始

### 本地开发
```bash
npm install
npm start
# 访问 http://localhost:9527
```

### Docker部署
```bash
# 1. 下载AI引擎
chmod +x scripts/deployment/download-engines.sh
./scripts/deployment/download-engines.sh

# 2. 启动服务
docker-compose -f docker/docker-compose.local.yml up -d

# 3. 查看日志
docker logs -f weiqi-game-server
```

## 📚 重要文档

| 文档 | 位置 | 说明 |
|------|------|------|
| 项目介绍 | `docs/README.md` | 完整的项目说明 |
| 快速开始 | `docs/guides/QUICK_START.md` | Ubuntu部署指南 |
| Docker部署 | `docs/guides/DOCKER_DEPLOYMENT.md` | 详细部署文档 |
| 故障排查 | `docs/guides/DOCKER_TROUBLESHOOTING.md` | 问题解决方案 |
| Claude指南 | `docs/CLAUDE.md` | Claude Code使用指南 |
| 项目规范 | `PROJECT_STRUCTURE.md` | 文件组织规范 |

## 🛠️ 常用脚本

| 脚本 | 位置 | 用途 |
|------|------|------|
| 部署脚本 | `scripts/deployment/deploy.sh` | 一键部署 |
| 下载引擎 | `scripts/deployment/download-engines.sh` | 下载AI引擎 |
| 调试Docker | `scripts/maintenance/debug-docker.sh` | Docker调试 |
| 验证部署 | `scripts/maintenance/verify-deployment.sh` | 验证部署状态 |

## 🐳 Docker文件

| 文件 | 位置 | 说明 |
|------|------|------|
| 本地构建 | `docker/Dockerfile.local` | 使用本地AI引擎 |
| 标准构建 | `docker/Dockerfile` | 构建时下载引擎 |
| 本地Compose | `docker/docker-compose.local.yml` | 推荐使用 |
| 标准Compose | `docker/docker-compose.yml` | 标准配置 |

## ⚠️ 重要变更

### 路径变更
- ❌ 旧：`./download-engines.sh`
- ✅ 新：`./scripts/deployment/download-engines.sh`

- ❌ 旧：`docker-compose.local.yml`
- ✅ 新：`docker/docker-compose.local.yml`

- ❌ 旧：`./deploy.sh`
- ✅ 新：`./scripts/deployment/deploy.sh`

### 文档位置
- 所有.md文档已移至 `docs/` 目录
- 使用指南在 `docs/guides/`
- 技术报告在 `docs/reports/`

### 废弃文件
- 旧版单机围棋代码已移至 `legacy/` 目录
- 不再使用，仅供参考

## 🔧 开发规范

详细规范请查看 `PROJECT_STRUCTURE.md`

### 添加新文件
- 文档 → `docs/guides/` 或 `docs/reports/`
- 脚本 → `scripts/deployment/` 或 `scripts/maintenance/`
- AI代码 → `ai/`
- 前端代码 → `public/`

### 命名规范
- 文档：大写+下划线 `QUICK_START.md`
- 脚本：小写+连字符 `deploy.sh`
- 代码：小写+连字符 `engine-manager.js`

## 📞 获取帮助

- 查看 `docs/guides/` 中的详细指南
- 查看 `PROJECT_STRUCTURE.md` 了解项目组织
- 查看 `docs/CLAUDE.md` 了解架构设计

---

**最后更新**: 2026-01-20
**版本**: v2.1 (结构优化版)
