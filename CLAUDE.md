# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

多人在线棋牌游戏平台，支持围棋、五子棋、中国象棋和斗地主四种游戏。支持联机对战和AI对弈两种模式。

## 常用命令

```bash
# 启动开发服务器（端口9527）
npm start

# 打包为可执行文件（Windows和Linux）
npm run build

# Docker部署
./deploy.sh
```

## 技术栈

- **后端**: Node.js + Express + ws (WebSocket)
- **前端**: 原生JavaScript + Canvas API
- **通信**: WebSocket (JSON消息格式)
- **存储**: 内存存储（无数据库）

## 架构

### 后端 (server.js)

单一服务器文件，核心功能：
- Express 提供静态文件服务 (`public/` 目录)
- WebSocket 房间管理系统（Map存储）
- 消息类型：`setName`, `getRooms`, `createRoom`, `joinRoom`, `leaveRoom`, `ready`, `gameAction`, `chat`

### 前端结构

```
public/
├── index.html          # 游戏大厅入口
├── js/lobby.js         # 大厅逻辑
├── css/common.css      # 公共样式
└── games/
    ├── weiqi/          # 围棋 (9x9, 13x13, 19x19)
    ├── gomoku/         # 五子棋 (15x15)
    ├── chess/          # 中国象棋 (10x9)
    └── doudizhu/       # 斗地主 (3人)
```

每个游戏目录包含独立的 `index.html` 和 `game.js`。

### 游戏模式

- **联机对战**: 通过WebSocket房间系统，玩家创建/加入房间进行对战
- **AI对弈**: 本地AI实现，围棋支持三个难度级别（easy/medium/hard）

### WebSocket通信流程

1. 客户端连接后发送 `setName` 设置昵称
2. `getRooms` 获取房间列表
3. `createRoom` / `joinRoom` 创建或加入房间
4. `ready` 准备，所有玩家准备后游戏开始
5. `gameAction` 同步游戏操作（落子、出牌等）
6. 断线自动重连（3秒间隔）

## 关键代码位置

| 功能 | 文件 |
|------|------|
| 服务器/房间管理 | `server.js` |
| 游戏大厅 | `public/js/lobby.js` |
| 围棋逻辑+AI | `public/games/weiqi/game.js` |
| 五子棋逻辑 | `public/games/gomoku/game.js` |
| 象棋逻辑 | `public/games/chess/game.js` |
| 斗地主逻辑 | `public/games/doudizhu/game.js` |

## 注意事项

- 端口默认9527，可通过环境变量 `PORT` 修改
- 房间状态存储在内存中，服务器重启会丢失
- 旧版围棋单机版代码在根目录 `js/` 和 `index.html`（已废弃，保留参考）
