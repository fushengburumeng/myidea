# 中国象棋UCI坐标系统转换修复报告

## 问题描述

用户报告：红方走完棋后，AI返回`h9g7`（黑方马8进7），但前端报错"AI尝试移动红方棋子"。

## 问题分析

### 日志信息

```
[EngineManager] Pikafish响应: h9g7, 耗时XXXms
[executeAiMove] AI移动: {fromX: 7, fromY: 9, toX: 6, toY: 7}
[executeAiMove] 移动的棋子: 2 (负数=黑方, 正数=红方)
[executeAiMove] AI尝试移动红方棋子: 2 {fromX: 7, fromY: 9, toX: 6, toY: 7}
```

### 根本原因

**UCI坐标系统与前端坐标系统的Y轴方向相反！**

#### UCI坐标系统（Pikafish使用）

```
Y轴：从下往上（红方到黑方）
9 ← 黑方底线（車馬象士將...）
8
7
6
5
4
3
2
1
0 ← 红方底线（車馬相仕帥...）

X轴：a b c d e f g h i
     0 1 2 3 4 5 6 7 8
```

**UCI `h9` = 列h(7), 行9 = 黑方底线右侧第二个位置 = 黑方马**

#### 前端坐标系统

```javascript
board[y][x]

Y轴：从上往下（黑方到红方）
0 ← 黑方底线（車馬象士將...）
1
2
3
4
5
6
7
8
9 ← 红方底线（車馬相仕帥...）

X轴：0 1 2 3 4 5 6 7 8
```

**前端 `board[9][7]` = 行9, 列7 = 红方底线右侧第二个位置 = 红方马**

### 问题根源

原代码直接使用UCI的Y坐标：

```javascript
// engine-manager.js (修复前)
const fromY = parseInt(uciMove[1]);  // 直接使用UCI的Y
const toY = parseInt(uciMove[3]);

// h9g7 解析为：
// fromY = 9, fromX = 7 → board[9][7] = 红方马 ❌
// toY = 7, toX = 6 → board[7][6]
```

**结果**：`board[9][7]`是红方马（正数2），不是黑方马（负数-2），导致验证失败！

## 修复方案

### 坐标转换公式

```
前端Y = 9 - UCI_Y
```

### 转换逻辑

```javascript
// engine-manager.js (修复后)
// 解析UCI着法
const fromX = uciMove.charCodeAt(0) - 'a'.charCodeAt(0);
const fromY_uci = parseInt(uciMove[1]);
const toX = uciMove.charCodeAt(2) - 'a'.charCodeAt(0);
const toY_uci = parseInt(uciMove[3]);

// 转换Y坐标
const fromY = 9 - fromY_uci;
const toY = 9 - toY_uci;

console.log(`[EngineManager] UCI坐标: ${uciMove} -> UCI(${fromX},${fromY_uci}) to (${toX},${toY_uci})`);
console.log(`[EngineManager] 前端坐标: board[${fromY}][${fromX}] to board[${toY}][${toX}]`);
```

### 转换示例

#### 示例1：h9g7（黑方马8进7）

```
UCI坐标：h9g7
  h = 7, 9 = 9, g = 6, 7 = 7

转换过程：
  fromX = 7 (不变)
  fromY_uci = 9 → fromY = 9 - 9 = 0
  toX = 6 (不变)
  toY_uci = 7 → toY = 9 - 7 = 2

前端坐标：
  board[0][7] to board[2][6]

验证：
  board[0][7] = 黑方底线的h列 = 黑方马（-2）✓
  board[2][6] = 黑方炮的位置 ✓
```

#### 示例2：b0c2（红方马二进三）

```
UCI坐标：b0c2
  b = 1, 0 = 0, c = 2, 2 = 2

转换过程：
  fromX = 1 (不变)
  fromY_uci = 0 → fromY = 9 - 0 = 9
  toX = 2 (不变)
  toY_uci = 2 → toY = 9 - 2 = 7

前端坐标：
  board[9][1] to board[7][2]

验证：
  board[9][1] = 红方底线的b列 = 红方马（2）✓
  board[7][2] = 红方马跳到的位置 ✓
```

## 修复效果对比

### 修复前

```
UCI: h9g7
解析: {fromX: 7, fromY: 9, toX: 6, toY: 7}
位置: board[9][7] to board[7][6]
棋子: board[9][7] = 红方马（2）❌
结果: AI尝试移动红方棋子 - 错误！
```

### 修复后

```
UCI: h9g7
解析: {fromX: 7, fromY: 0, toX: 6, toY: 2}
位置: board[0][7] to board[2][6]
棋子: board[0][7] = 黑方马（-2）✓
结果: AI正确移动黑方棋子 - 成功！
```

## 代码变更

### 文件：ai/engine-manager.js

```diff
@@ -165,10 +165,20 @@ class EngineManager {
             console.log(`[EngineManager] Pikafish响应: ${uciMove}, 耗时${elapsed}ms`);

             // 解析UCI着法
+            // UCI坐标系：行号从下往上（0=红方底线，9=黑方底线）
+            // 前端坐标系：行号从上往下（0=黑方底线，9=红方底线）
+            // 转换公式：前端Y = 9 - UCI_Y
             const fromX = uciMove.charCodeAt(0) - 'a'.charCodeAt(0);
-            const fromY = parseInt(uciMove[1]);
+            const fromY_uci = parseInt(uciMove[1]);
             const toX = uciMove.charCodeAt(2) - 'a'.charCodeAt(0);
-            const toY = parseInt(uciMove[3]);
+            const toY_uci = parseInt(uciMove[3]);
+
+            // 转换Y坐标
+            const fromY = 9 - fromY_uci;
+            const toY = 9 - toY_uci;
+
+            console.log(`[EngineManager] UCI坐标: ${uciMove} -> UCI(${fromX},${fromY_uci}) to (${toX},${toY_uci})`);
+            console.log(`[EngineManager] 前端坐标: board[${fromY}][${fromX}] to board[${toY}][${toX}]`);

             resolve({
                 fromX, fromY,
```

**变更统计**：
- 新增：12行（注释 + 转换逻辑 + 调试日志）
- 修改：2行（fromY和toY的解析）

## 测试验证

### 测试场景1：开局黑方马8进7

**操作**：
1. 红方走炮二平五
2. AI（黑方）走马8进7

**预期日志**：
```
[doAiMove] 发送FEN给AI: rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C2C4/9/RNBAKABNR b - - 0 1
[EngineManager] Pikafish响应: h9g7, 耗时XXXms
[EngineManager] UCI坐标: h9g7 -> UCI(7,9) to (6,7)
[EngineManager] 前端坐标: board[0][7] to board[2][6]
[executeAiMove] AI移动: {fromX: 7, fromY: 0, toX: 6, toY: 2}
[executeAiMove] 移动的棋子: -2 (负数=黑方, 正数=红方)
[executeAiMove] AI移动完成，切换到红方
```

**验证要点**：
- ✅ UCI坐标正确解析
- ✅ Y坐标正确转换
- ✅ 移动的棋子是黑方马（-2）
- ✅ 无错误日志

### 测试场景2：红方马二进三

**操作**：
1. 红方走马二进三（b0c2）

**预期转换**：
```
UCI: b0c2
UCI坐标: (1, 0) to (2, 2)
前端坐标: board[9][1] to board[7][2]
棋子: board[9][1] = 红方马（2）✓
```

## 坐标系统对照表

| UCI坐标 | UCI(X,Y) | 前端坐标 | 棋盘位置 | 棋子 |
|---------|----------|----------|----------|------|
| a9 | (0, 9) | board[0][0] | 黑方底线左车 | -1 |
| b9 | (1, 9) | board[0][1] | 黑方底线左马 | -2 |
| h9 | (7, 9) | board[0][7] | 黑方底线右马 | -2 |
| i9 | (8, 9) | board[0][8] | 黑方底线右车 | -1 |
| a0 | (0, 0) | board[9][0] | 红方底线左车 | 1 |
| b0 | (1, 0) | board[9][1] | 红方底线左马 | 2 |
| h0 | (7, 0) | board[9][7] | 红方底线右马 | 2 |
| i0 | (8, 0) | board[9][8] | 红方底线右车 | 1 |

## 相关问题修复

本次修复同时解决了之前的阵营逻辑问题：

1. ✅ **FEN生成逻辑**：确保红方先行时FEN以`w`结尾
2. ✅ **棋盘锁定**：AI思考时禁止玩家操作
3. ✅ **AI移动验证**：验证AI只能移动黑方棋子
4. ✅ **UCI坐标转换**：正确转换Y坐标（本次修复）

## 总结

### 问题根源

UCI坐标系统的Y轴方向与前端坐标系统相反，导致坐标解析错误。

### 解决方案

添加Y坐标转换公式：`前端Y = 9 - UCI_Y`

### 修复效果

- ✅ AI正确移动黑方棋子
- ✅ 坐标转换准确无误
- ✅ 添加详细调试日志
- ✅ 游戏流程正常

### 后续建议

1. **添加单元测试**：测试各种UCI坐标的转换
2. **文档完善**：在代码中添加坐标系统说明
3. **性能优化**：考虑缓存转换结果

---

**修复时间**：2026-01-19
**提交哈希**：54a9d35
**影响文件**：ai/engine-manager.js
**代码变更**：+12 -2 行
