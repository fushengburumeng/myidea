# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

多人在线棋牌游戏平台，支持围棋、五子棋、中国象棋和斗地主四种游戏。支持联机对战和AI对弈两种模式。集成专业AI引擎（KataGo、Pikafish）提供高水平AI对弈。

## 常用命令

### 开发与运行
```bash
# 启动开发服务器（端口9527）
npm start

# 打包为可执行文件（Windows和Linux）
npm run build
```

### Docker部署
```bash
# 下载AI引擎（首次部署必须）
./scripts/deployment/download-engines.sh

# 使用本地构建部署（推荐）
docker-compose -f docker/docker-compose.local.yml up -d

# 查看日志
docker logs -f weiqi-game-server

# 重启服务
docker restart weiqi-game-server

# 停止服务
docker-compose -f docker/docker-compose.local.yml down
```

### AI引擎管理
```bash
# 检查AI引擎状态
docker logs weiqi-game-server | grep -E "KataGo|Pikafish|AI引擎"

# 进入容器调试
docker exec -it weiqi-game-server sh

# 测试KataGo
docker exec weiqi-game-server /app/ai/bin/katago/katago version

# 测试Pikafish
docker exec weiqi-game-server sh -c "echo quit | /app/ai/bin/pikafish/pikafish"
```

## 技术栈

- **后端**: Node.js + Express + ws (WebSocket)
- **前端**: 原生JavaScript + Canvas API
- **AI引擎**: KataGo (围棋) + Pikafish (象棋)
- **并发管理**: Worker Threads (线程池)
- **通信**: WebSocket (JSON消息格式)
- **存储**: 内存存储（无数据库）
- **部署**: Docker + Docker Compose

## 架构

### 后端架构 (server.js)

单一服务器文件，核心功能：
- Express 提供静态文件服务 (`public/` 目录)
- WebSocket 房间管理系统（Map存储）
- AI引擎管理器集成（可选加载）
- 消息类型：`setName`, `getRooms`, `createRoom`, `joinRoom`, `leaveRoom`, `ready`, `gameAction`, `chat`, `aiRequest`, `getAiStatus`

### AI引擎架构

```
ai/
├── engine-manager.js       # 引擎管理器（Worker池管理）
├── worker-pool.js          # Worker线程池实现
├── katago-adapter.js       # KataGo适配器（GTP协议）
├── pikafish-adapter.js     # Pikafish适配器（UCI协议）
├── katago-worker.js        # KataGo Worker线程
├── pikafish-worker.js      # Pikafish Worker线程
└── bin/
    ├── katago/
    │   ├── katago          # KataGo可执行文件
    │   ├── b6.bin.gz       # 神经网络模型
    │   └── config.cfg      # 配置文件
    └── pikafish/
        └── pikafish        # Pikafish可执行文件
```

**关键设计**：
- **Worker线程池**：每个引擎维护3个Worker，避免进程启动开销
- **请求队列**：池满时自动排队，防止过载
- **自动回退**：服务端AI失败时前端自动使用本地AI
- **协议适配**：KataGo使用GTP协议，Pikafish使用UCI协议

### 前端结构

```
public/
├── index.html          # 游戏大厅入口
├── js/lobby.js         # 大厅逻辑（房间列表、WebSocket连接）
├── css/common.css      # 公共样式
└── games/
    ├── weiqi/          # 围棋 (19x19, 支持服务端AI)
    ├── gomoku/         # 五子棋 (15x15, 本地AI)
    ├── chess/          # 中国象棋 (10x9, 支持服务端AI)
    └── doudizhu/       # 斗地主 (3人)
```

每个游戏目录包含独立的 `index.html` 和 `game.js`。

### 游戏模式

- **联机对战**：通过WebSocket房间系统，玩家创建/加入房间进行对战
- **AI对弈**：
  - 围棋：优先使用服务端KataGo（业余高段），失败回退到本地AI（三个难度）
  - 象棋：优先使用服务端Pikafish（专业级），失败回退到本地AI
  - 五子棋：本地Minimax算法AI

### WebSocket通信流程

**房间管理**：
1. 客户端连接后发送 `setName` 设置昵称
2. `getRooms` 获取房间列表
3. `createRoom` / `joinRoom` 创建或加入房间
4. `ready` 准备，所有玩家准备后游戏开始
5. `gameAction` 同步游戏操作（落子、出牌等）
6. `leaveRoom` 离开房间
7. 断线自动重连（3秒间隔）

**AI请求**：
1. 客户端发送 `aiRequest` 消息（包含游戏类型、棋盘状态）
2. 服务端通过Worker池调用AI引擎
3. 服务端返回 `aiResponse` 消息（包含AI着法）
4. 失败时返回错误，客户端自动回退到本地AI

## 关键代码位置

| 功能 | 文件 |
|------|------|
| 服务器/房间管理 | `server.js` |
| AI引擎管理器 | `ai/engine-manager.js` |
| Worker线程池 | `ai/worker-pool.js` |
| KataGo适配器 | `ai/katago-adapter.js` |
| Pikafish适配器 | `ai/pikafish-adapter.js` |
| 游戏大厅 | `public/js/lobby.js` |
| 围棋逻辑+AI | `public/games/weiqi/game.js` |
| 五子棋逻辑 | `public/games/gomoku/game.js` |
| 象棋逻辑 | `public/games/chess/game.js` |
| 斗地主逻辑 | `public/games/doudizhu/game.js` |

## Docker部署

### 两种Dockerfile

1. **Dockerfile**：标准构建，在构建时下载AI引擎（可能因网络问题失败）
2. **Dockerfile.local**：本地构建，使用本地已下载的AI引擎（推荐）

### 部署流程

1. 运行 `./scripts/deployment/download-engines.sh` 下载AI引擎到 `ai/bin/`
2. 使用 `docker/docker-compose.local.yml` 构建镜像（基于Dockerfile.local）
3. 容器启动时自动初始化Worker池
4. 健康检查确保服务正常运行

### 资源配置

- **内存限制**：1200M（可在docker/docker-compose.local.yml调整）
- **CPU限制**：2核（可调整）
- **KataGo配置**：`ai/bin/katago/config.cfg`
  - `maxVisits = 100`（搜索次数，影响棋力和速度）
  - `numSearchThreads = 1`（线程数）

## AI引擎配置

### KataGo性能调优

编辑 `ai/bin/katago/config.cfg`：
```cfg
maxVisits = 100          # 50(快速) / 100(平衡) / 200(强力)
numSearchThreads = 1     # 线程数（1-2）
rules = chinese          # 规则（chinese/japanese/tromp-taylor）
```

### Pikafish性能调优

编辑 `ai/pikafish-adapter.js`：
```javascript
async getMove(fen, depth = 10) {  // 搜索深度：8-12
```

## 重要注意事项

### 开发
- 端口默认9527，可通过环境变量 `PORT` 修改
- 房间状态存储在内存中，服务器重启会丢失
- AI引擎文件不在git仓库中，需手动下载
- 旧版围棋单机版代码在根目录 `js/` 和 `index.html`（已废弃，保留参考）

### Docker部署
- 必须先运行 `./scripts/deployment/download-engines.sh` 下载AI引擎
- 使用 `docker/docker-compose.local.yml` 而非 `docker-compose.yml`
- 基础镜像必须是 `node:18-bookworm-slim`（支持GLIBC 2.34+）
- AI引擎需要执行权限（`chmod +x`）

### AI引擎
- Worker池大小固定为3，池满时请求会排队
- 超时时间：KataGo 60秒，Pikafish 60秒
- 引擎文件缺失时服务器仍可启动，但AI功能不可用
- 前端会自动检测服务端AI可用性并回退到本地AI

### 故障排查
- 查看AI引擎日志：`docker logs weiqi-game-server | grep -E "KataGo|Pikafish"`
- 检查引擎文件：`docker exec weiqi-game-server ls -lh /app/ai/bin/katago/`
- 测试引擎：`docker exec weiqi-game-server /app/ai/bin/katago/katago version`
- 详细排查指南：参考 `DOCKER_TROUBLESHOOTING.md`
