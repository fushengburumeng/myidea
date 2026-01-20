# 围棋游戏平台

> **重要提示**: 项目结构已优化，请查看 [QUICK_REFERENCE.md](QUICK_REFERENCE.md) 快速上手

多人在线棋牌游戏平台，支持围棋、五子棋、中国象棋和斗地主。集成专业AI引擎（KataGo、Pikafish）。

## 快速开始

```bash
# 本地开发
npm install && npm start

# Docker部署
./scripts/deployment/download-engines.sh
docker-compose -f docker/docker-compose.local.yml up -d
```

## 文档导航

- 📖 [完整文档](docs/README.md) - 详细的项目介绍
- 🚀 [快速参考](QUICK_REFERENCE.md) - 快速上手指南
- 📋 [项目规范](PROJECT_STRUCTURE.md) - 文件组织规范
- 🤖 [Claude指南](docs/CLAUDE.md) - Claude Code使用指南

## 项目结构

```
weiqi/
├── ai/                    # AI引擎模块
├── docker/                # Docker配置
├── docs/                  # 项目文档
├── public/                # 前端代码
├── scripts/               # 脚本工具
├── server.js              # 主服务器
└── PROJECT_STRUCTURE.md   # 项目规范
```

详见 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

## 技术栈

- **后端**: Node.js + Express + WebSocket
- **前端**: 原生JavaScript + Canvas
- **AI引擎**: KataGo (围棋) + Pikafish (象棋)
- **部署**: Docker + Docker Compose

## 许可证

MIT License

---

**版本**: v2.1 (结构优化版) | **更新**: 2026-01-20
