# 围棋游戏平台 🎮

多人在线棋牌游戏平台，支持围棋、五子棋、中国象棋和斗地主。集成高质量AI引擎，提供专业级AI对弈体验。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)

## ✨ 特性

### 游戏功能
- 🎯 **四种游戏**：围棋、五子棋、中国象棋、斗地主
- 👥 **联机对战**：实时WebSocket通信
- 🤖 **AI对弈**：集成专业AI引擎
- 🏠 **房间系统**：创建/加入/离开房间
- 💬 **聊天功能**：实时聊天交流

### AI引擎
- ♟️ **围棋AI**：KataGo（业余高段水平，2-5秒响应）
- 🐴 **象棋AI**：Pikafish（专业级水平，<1秒响应）
- ⚫ **五子棋AI**：增强算法（业余高手水平，<0.5秒响应）

### 技术特点
- 🐳 **Docker部署**：一键部署，开箱即用
- 🔄 **自动回退**：服务端AI失败时自动使用本地AI
- 📊 **资源管理**：智能引擎管理，空闲自动关闭
- 🚀 **高性能**：并发控制，请求队列优化

## 🚀 快速开始

### 方式一：Docker部署（推荐）

**适用于：** Ubuntu 24.04 LTS（或其他Linux发行版）

```bash
# 1. 克隆项目
git clone https://github.com/fushengburumeng/myidea.git
cd myidea/weiqi

# 2. 下载AI引擎
chmod +x download-engines.sh
./download-engines.sh

# 3. 启动服务
docker-compose -f docker-compose.local.yml up -d

# 4. 查看日志
docker logs -f weiqi-game-server
```

**访问游戏：** `http://your-server-ip:9527`

**详细文档：** [QUICK_START.md](QUICK_START.md)

### 方式二：本地运行

```bash
# 1. 安装依赖
npm install

# 2. 下载AI引擎（可选）
./download-engines.sh

# 3. 启动服务
npm start
```

**访问游戏：** `http://localhost:9527`

## 📖 文档

### 快速开始
- **[QUICK_START.md](QUICK_START.md)** ⭐ - Ubuntu 24.04快速部署（推荐）
- **[README_DOCKER.md](README_DOCKER.md)** - Docker快速开始指南

### 详细文档
- **[DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)** - Docker完整部署指南（20+页）
- **[DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md)** - 故障排查指南
- **[AI_IMPLEMENTATION.md](AI_IMPLEMENTATION.md)** - AI实现技术方案
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 通用部署文档

### 项目文档
- **[CLAUDE.md](CLAUDE.md)** - 项目说明和架构
- **[SUMMARY.md](SUMMARY.md)** - 完整实施总结

## 🎯 AI引擎性能

| 游戏 | AI引擎 | 棋力水平 | 响应时间 | 资源占用 |
|------|--------|----------|----------|----------|
| 围棋 | KataGo v1.15.3 (b6) | 业余高段 | 2-5秒 | ~400MB |
| 中国象棋 | Pikafish (BMI2) | 专业级 | <1秒 | ~200MB |
| 五子棋 | 增强算法 (Minimax) | 业余高手 | <0.5秒 | ~10MB |

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (Browser)                      │
│  围棋 | 五子棋 | 中国象棋 | 斗地主                      │
└────────────────────┬────────────────────────────────────┘
                     │ WebSocket
┌────────────────────▼────────────────────────────────────┐
│                  Node.js 服务器                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │            引擎管理器 (Engine Manager)            │  │
│  │  ┌──────────────┐  ┌──────────────┐             │  │
│  │  │ KataGo       │  │ Pikafish     │             │  │
│  │  │ (围棋AI)     │  │ (象棋AI)     │             │  │
│  │  └──────────────┘  └──────────────┘             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 📊 系统要求

### 服务器配置
- **CPU**: 2核或以上
- **内存**: 2GB或以上
- **硬盘**: 2GB可用空间
- **系统**: Ubuntu 24.04 LTS（推荐）或其他Linux发行版

### 软件依赖
- **Docker**: 20.10+（推荐）
- **Node.js**: 14.0+（本地运行）
- **npm**: 6.0+（本地运行）

## 🔧 配置

### AI引擎配置

**KataGo（围棋）：** `ai/bin/katago/config.cfg`
```cfg
maxVisits = 100      # 搜索次数：50(快) / 100(平衡) / 200(强)
numSearchThreads = 1 # 线程数
```

**Pikafish（象棋）：** `ai/pikafish-adapter.js`
```javascript
async getMove(fen, depth = 10) {  // 搜索深度：8-12
```

### 服务器配置

**端口：** `server.js`
```javascript
const PORT = process.env.PORT || 9527;
```

**资源限制：** `docker-compose.local.yml`
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

## 📈 性能优化

### 调整AI搜索深度

```bash
# 进入容器
docker exec -it weiqi-game-server sh

# 编辑KataGo配置
vi /app/ai/bin/katago/config.cfg
# 修改 maxVisits: 50(快) / 100(平衡) / 200(强)

# 重启容器
exit
docker restart weiqi-game-server
```

### 调整容器资源

```bash
# 增加内存到3GB
docker update --memory=3g weiqi-game-server

# 增加CPU到4核
docker update --cpus=4 weiqi-game-server
```

## 🐛 故障排查

### 常见问题

**Q: AI引擎下载失败？**
```bash
# 使用下载脚本（支持多版本和镜像源）
./download-engines.sh

# 或手动下载，详见 QUICK_START.md
```

**Q: Docker构建失败？**
```bash
# 使用本地构建方案
./download-engines.sh
docker build -f Dockerfile.local -t weiqi-game-platform .
```

**Q: AI引擎不可用？**
```bash
# 查看日志
docker logs weiqi-game-server | grep -E "KataGo|Pikafish"

# 检查引擎文件
docker exec weiqi-game-server ls -lh /app/ai/bin/katago/
docker exec weiqi-game-server ls -lh /app/ai/bin/pikafish/
```

**更多问题：** 查看 [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md)

## 🔄 更新部署

```bash
# 拉取最新代码
cd myidea/weiqi
git pull origin master

# 重新下载引擎（如果有更新）
./download-engines.sh

# 重新构建并启动
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d --build
```

## 📝 开发

### 项目结构

```
weiqi/
├── ai/                          # AI引擎
│   ├── engine-manager.js        # 引擎管理器
│   ├── katago-adapter.js        # KataGo适配器
│   ├── pikafish-adapter.js      # Pikafish适配器
│   └── bin/                     # 引擎可执行文件
├── public/                      # 前端代码
│   ├── games/                   # 游戏逻辑
│   │   ├── weiqi/              # 围棋
│   │   ├── chess/              # 中国象棋
│   │   ├── gomoku/             # 五子棋
│   │   └── doudizhu/           # 斗地主
│   └── js/                      # 公共JS
├── server.js                    # 主服务器
├── package.json                 # 依赖配置
├── Dockerfile                   # Docker配置
└── docker-compose.yml           # Docker Compose配置
```

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 访问
http://localhost:9527
```

### 添加新游戏

1. 在 `public/games/` 创建新目录
2. 实现游戏逻辑（参考现有游戏）
3. 在 `server.js` 添加游戏状态管理
4. 更新大厅页面

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- **[KataGo](https://github.com/lightvector/KataGo)** - 强大的开源围棋AI
- **[Pikafish](https://github.com/official-pikafish/Pikafish)** - 优秀的中国象棋引擎
- **[Node.js](https://nodejs.org/)** - 高性能JavaScript运行时
- **[Express](https://expressjs.com/)** - Web应用框架
- **[ws](https://github.com/websockets/ws)** - WebSocket库
- **[Docker](https://www.docker.com/)** - 容器化平台

## 📞 联系方式

- **项目地址**: https://github.com/fushengburumeng/myidea
- **问题反馈**: [GitHub Issues](https://github.com/fushengburumeng/myidea/issues)
- **讨论交流**: [GitHub Discussions](https://github.com/fushengburumeng/myidea/discussions)

## 🌟 Star History

如果这个项目对你有帮助，请给个 Star ⭐️

---

**最后更新**: 2025-01-19

**版本**: v2.0 (AI引擎集成版)

**部署完成！** 🎉 访问 `http://your-server-ip:9527` 开始游戏！
