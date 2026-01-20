# Legacy 废弃代码

本目录包含项目的旧版本代码，已不再使用，仅供参考。

## 内容说明

### 旧版单机围棋游戏

- `index.html` - 旧版游戏页面
- `style.css` - 旧版样式
- `js/` - 旧版JavaScript代码
  - `ai.js` - 旧版AI实现
  - `board.js` - 旧版棋盘逻辑
  - `game.js` - 旧版游戏逻辑
  - `ui.js` - 旧版UI逻辑

## 为什么废弃？

旧版是单机版围棋游戏，功能有限：
- ❌ 只支持单机游戏
- ❌ 只有围棋一种游戏
- ❌ AI实现较简单
- ❌ 没有联机对战功能

## 新版改进

新版（`public/` 目录）提供了更多功能：
- ✅ 支持四种游戏（围棋、五子棋、象棋、斗地主）
- ✅ 支持联机对战
- ✅ 集成专业AI引擎（KataGo、Pikafish）
- ✅ WebSocket实时通信
- ✅ 房间系统

## 代码对比

### 旧版架构
```
index.html (单页面)
├── js/ai.js (简单AI)
├── js/board.js (棋盘)
├── js/game.js (游戏逻辑)
└── js/ui.js (UI)
```

### 新版架构
```
public/
├── index.html (游戏大厅)
├── games/
│   ├── weiqi/ (围棋)
│   ├── gomoku/ (五子棋)
│   ├── chess/ (象棋)
│   └── doudizhu/ (斗地主)
└── js/lobby.js (大厅逻辑)

server.js (WebSocket服务器)
ai/ (专业AI引擎)
```

## 是否可以删除？

**建议保留**，原因：
1. 可作为简单AI实现的参考
2. 可作为Canvas绘图的参考
3. 可作为单机游戏的参考
4. 文件不大，不影响项目

如果确定不需要，可以安全删除整个 `legacy/` 目录。

## 迁移指南

如果需要从旧版迁移到新版：

1. **AI逻辑**：参考 `public/games/weiqi/game.js` 中的本地AI实现
2. **棋盘绘制**：参考 `public/games/weiqi/game.js` 中的Canvas绘图
3. **游戏逻辑**：参考 `public/games/weiqi/game.js` 中的规则实现

## 相关文档

- [项目规范](../PROJECT_STRUCTURE.md)
- [快速参考](../QUICK_REFERENCE.md)

---

**废弃时间**: 2026-01-20
**原因**: 功能升级，架构重构
