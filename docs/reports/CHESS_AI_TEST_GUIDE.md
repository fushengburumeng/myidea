# 中国象棋AI测试指南

## 测试步骤

### 1. 启动服务
```bash
npm start
# 或使用Docker
./scripts/deployment/deploy.sh
```

### 2. 访问游戏
```
浏览器打开: http://localhost:9527
```

### 3. 开始AI对弈
1. 点击"中国象棋"
2. 选择"AI对弈"模式
3. 打开浏览器控制台（F12）

### 4. 观察日志

**红方走棋后，应该看到：**
```
[doAiMove] 发送FEN给AI: rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR b - - 0 1
[doAiMove] 当前玩家: 1 (0=红方, 1=黑方)
[EngineManager] Pikafish响应: h9g7, 耗时XXXms
[executeAiMove] AI移动: {fromX: 7, fromY: 9, toX: 6, toY: 7}
[executeAiMove] 移动的棋子: -2 (负数=黑方, 正数=红方)
[executeAiMove] AI移动完成，切换到红方
```

### 5. 验证要点

✅ **FEN正确性**
- 红方走完后，FEN应该以 `b` 结尾（黑方先行）
- 开局时，FEN应该以 `w` 结尾（红方先行）

✅ **棋盘锁定**
- AI思考时，点击棋盘无响应
- AI走完后，可以继续走棋

✅ **AI移动正确性**
- AI移动的棋子应该是负数（黑方）
- AI不应该移动红方棋子（正数）

✅ **坐标正确性**
- h9g7 应该移动黑方马（从h9到g7）
- 棋盘上应该看到黑方马移动

## 常见问题排查

### 问题1：AI返回了无效的移动
**日志：**
```
[executeAiMove] 无效的移动数据: undefined
```

**原因：**
- 后端AI引擎未启动
- 网络连接问题

**解决：**
```bash
# 检查AI引擎状态
docker logs weiqi-game-server | grep -E "KataGo|Pikafish"

# 重启服务
docker restart weiqi-game-server
```

### 问题2：AI尝试移动红方棋子
**日志：**
```
[executeAiMove] AI尝试移动红方棋子: 2 {fromX: 7, fromY: 6, toX: 6, toY: 4}
```

**原因：**
- FEN生成错误
- 坐标解析错误

**解决：**
- 检查FEN字符串是否正确
- 检查UCI坐标解析逻辑

### 问题3：AI思考时可以走棋
**症状：**
- AI思考时点击棋盘仍有响应

**原因：**
- aiThinking标志未正确设置

**解决：**
- 检查doAiMove()是否设置了aiThinking = true
- 检查executeAiMove()是否重置了aiThinking = false

## 性能测试

### AI响应时间
- **正常范围**：5-30秒
- **超时阈值**：60秒
- **优化建议**：调整depth参数（默认10）

### 内存使用
- **正常范围**：200-500MB
- **峰值**：1GB
- **优化建议**：调整引擎线程数

## 调试技巧

### 1. 查看完整FEN
```javascript
// 在控制台执行
console.log(boardToFen());
```

### 2. 查看棋盘状态
```javascript
// 在控制台执行
console.table(board);
```

### 3. 查看当前玩家
```javascript
// 在控制台执行
console.log('currentPlayer:', currentPlayer, '(0=红方, 1=黑方)');
```

### 4. 查看AI思考状态
```javascript
// 在控制台执行
console.log('aiThinking:', aiThinking);
```

## 成功标准

✅ 红方先行，FEN以 `w` 结尾
✅ 红方走完后，FEN以 `b` 结尾
✅ AI正确移动黑方棋子
✅ AI思考时棋盘锁定
✅ AI走完后棋盘解锁
✅ 无错误日志
✅ 游戏流程顺畅

## 快速验证脚本

在浏览器控制台执行以下代码进行快速验证：

```javascript
// 验证FEN生成
function testFEN() {
    console.log('=== FEN测试 ===');
    console.log('当前玩家:', currentPlayer);
    const fen = boardToFen();
    console.log('FEN:', fen);
    const sideToMove = fen.split(' ')[1];
    console.log('Side to move:', sideToMove);

    if (currentPlayer === 0 && sideToMove === 'w') {
        console.log('✅ FEN正确：红方回合，FEN以w结尾');
    } else if (currentPlayer === 1 && sideToMove === 'b') {
        console.log('✅ FEN正确：黑方回合，FEN以b结尾');
    } else {
        console.error('❌ FEN错误：currentPlayer与side-to-move不匹配');
    }
}

// 验证棋盘状态
function testBoard() {
    console.log('=== 棋盘测试 ===');
    console.log('红方棋子（正数）：');
    let redPieces = 0;
    let blackPieces = 0;
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
            if (board[y][x] > 0) redPieces++;
            if (board[y][x] < 0) blackPieces++;
        }
    }
    console.log('红方棋子数:', redPieces);
    console.log('黑方棋子数:', blackPieces);
}

// 执行测试
testFEN();
testBoard();
```

## 预期日志示例

### 正常流程日志

```
// 游戏开始
游戏开始！你执红先行

// 红方走棋（例如：炮二平五）
[doAiMove] 发送FEN给AI: rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR b - - 0 1
[doAiMove] 当前玩家: 1 (0=红方, 1=黑方)
AI思考中...

// AI响应
[EngineManager] Pikafish响应: h9g7, 耗时8234ms
[executeAiMove] AI移动: {fromX: 7, fromY: 9, toX: 6, toY: 7}
[executeAiMove] 移动的棋子: -2 (负数=黑方, 正数=红方)
[executeAiMove] AI移动完成，切换到红方

// 继续对弈...
```

### 错误日志示例

```
// AI引擎未启动
[executeAiMove] 无效的移动数据: undefined
AI返回了无效的移动

// AI尝试移动红方棋子
[executeAiMove] AI尝试移动红方棋子: 2 {fromX: 7, fromY: 6, toX: 6, toY: 4}
AI移动错误：尝试移动红方棋子
```

## 性能优化建议

### 1. 调整AI搜索深度

编辑 `public/games/chess/game.js:362`：
```javascript
ws.send(JSON.stringify({
    type: 'aiRequest',
    game: 'chess',
    fen: fen,
    depth: 8  // 降低深度加快响应（默认10）
}));
```

### 2. 调整引擎线程数

编辑 `ai/pikafish-adapter.js:71-72`：
```javascript
this.send('setoption name Threads value 2');  // 增加线程数
this.send('setoption name Hash value 128');   // 增加哈希表大小
```

### 3. 监控性能

```bash
# 查看AI引擎响应时间
docker logs weiqi-game-server | grep "Pikafish响应"

# 查看内存使用
docker stats weiqi-game-server
```

## 相关文档

- `CHESS_AI_FIX_REPORT.md` - 完整修复报告
- `AI_IMPLEMENTATION.md` - AI引擎实现方案
- `QUICKSTART.md` - 快速开始指南
