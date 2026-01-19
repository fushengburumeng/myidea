# AI引擎接入实施文档

## 概述

本文档描述如何为围棋、五子棋、中国象棋三个游戏接入真正的AI引擎，替换现有的简单规则AI。

**目标服务器配置**：2核CPU / 2GB内存 / 40GB硬盘

**预计资源占用**：峰值约1GB内存，硬盘约100MB

---

## 一、引擎选型

| 游戏 | 引擎 | 协议 | 说明 |
|------|------|------|------|
| 围棋 | KataGo (b6模型) | GTP | 开源最强围棋AI，小模型适合低配服务器 |
| 中国象棋 | Pikafish | UCI | 象棋版Stockfish，NNUE神经网络 |
| 五子棋 | 自研增强算法 | - | 加深搜索+威胁空间搜索，无需外部引擎 |

---

## 二、文件结构规划

```
weiqi/
├── server.js                    # 主服务器（需修改）
├── ai/                          # 新增：AI引擎目录
│   ├── engine-manager.js        # 引擎进程管理器
│   ├── katago-adapter.js        # KataGo GTP协议适配器
│   ├── pikafish-adapter.js      # Pikafish UCI协议适配器
│   └── bin/                     # 引擎可执行文件
│       ├── katago/
│       │   ├── katago.exe       # Windows
│       │   ├── katago           # Linux
│       │   └── b6.bin.gz        # 神经网络模型
│       └── pikafish/
│           ├── pikafish.exe     # Windows
│           └── pikafish         # Linux
├── public/
│   └── games/
│       ├── weiqi/game.js        # 需修改：改为请求服务端AI
│       ├── chess/game.js        # 需修改：改为请求服务端AI
│       └── gomoku/game.js       # 需修改：增强本地AI算法
```

---

## 三、实施步骤

### 阶段1：五子棋AI增强（本地算法优化）

**工作量**：0.5天

**无需外部引擎**，直接优化现有JavaScript代码。

#### 1.1 优化内容

```javascript
// public/games/gomoku/game.js

// 1. 增加搜索深度（当前无搜索，改为Minimax 4-6层）
// 2. 添加威胁空间搜索(TSS)处理连续冲四
// 3. 优化评估函数，识别更多棋型：
//    - 活四、冲四、活三、眠三、活二等
// 4. 添加算杀（VCT/VCF搜索）
```

#### 1.2 关键改动

| 文件 | 改动 |
|------|------|
| `public/games/gomoku/game.js` | 重写 `aiMove()` 和 `evaluateMove()` 函数 |

---

### 阶段2：中国象棋接入Pikafish

**工作量**：1天

#### 2.1 下载引擎

```bash
# Linux (在服务器执行)
mkdir -p ai/bin/pikafish
cd ai/bin/pikafish

# 从GitHub下载最新release
wget https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-bmi2
chmod +x pikafish-bmi2
mv pikafish-bmi2 pikafish
```

#### 2.2 创建UCI适配器

```javascript
// ai/pikafish-adapter.js

const { spawn } = require('child_process');
const path = require('path');

class PikafishAdapter {
    constructor() {
        this.process = null;
        this.ready = false;
        this.pendingCallback = null;
    }

    start() {
        const enginePath = process.platform === 'win32'
            ? path.join(__dirname, 'bin/pikafish/pikafish.exe')
            : path.join(__dirname, 'bin/pikafish/pikafish');

        this.process = spawn(enginePath);
        this.process.stdout.on('data', (data) => this.handleOutput(data.toString()));

        // 初始化UCI
        this.send('uci');
        this.send('setoption name Threads value 1');
        this.send('setoption name Hash value 64');
        this.send('isready');
    }

    send(command) {
        if (this.process) {
            this.process.stdin.write(command + '\n');
        }
    }

    handleOutput(output) {
        const lines = output.trim().split('\n');
        for (const line of lines) {
            if (line === 'readyok') {
                this.ready = true;
            }
            if (line.startsWith('bestmove')) {
                const move = line.split(' ')[1];
                if (this.pendingCallback) {
                    this.pendingCallback(move);
                    this.pendingCallback = null;
                }
            }
        }
    }

    // FEN: 象棋局面字符串
    // 返回UCI格式着法，如 "h2e2"
    async getMove(fen, depth = 10) {
        return new Promise((resolve) => {
            this.pendingCallback = resolve;
            this.send(`position fen ${fen}`);
            this.send(`go depth ${depth}`);
        });
    }

    stop() {
        if (this.process) {
            this.send('quit');
            this.process.kill();
            this.process = null;
        }
    }
}

module.exports = PikafishAdapter;
```

#### 2.3 坐标转换

象棋棋盘坐标与UCI坐标的转换：

```javascript
// UCI使用 a0-i9 坐标系
// 内部使用 [x][y] 数组索引

function boardToUci(x, y) {
    const file = String.fromCharCode('a'.charCodeAt(0) + x);
    const rank = y.toString();
    return file + rank;
}

function uciToBoard(uci) {
    const x = uci.charCodeAt(0) - 'a'.charCodeAt(0);
    const y = parseInt(uci[1]);
    return { x, y };
}

// 示例：内部坐标(4,0)对应UCI "e0"
```

#### 2.4 前端改动

```javascript
// public/games/chess/game.js

// 修改 doAiMove() 函数，改为向服务器请求
async function doAiMove() {
    updateStatus('AI思考中...');

    const fen = boardToFen(); // 需要实现：将棋盘转为FEN字符串

    ws.send(JSON.stringify({
        type: 'aiRequest',
        game: 'chess',
        fen: fen
    }));
}

// 在WebSocket消息处理中添加
case 'aiResponse':
    const { fromX, fromY, toX, toY } = msg.move;
    executeMove(fromX, fromY, toX, toY);
    break;
```

---

### 阶段3：围棋接入KataGo

**工作量**：1天

#### 3.1 下载引擎和模型

```bash
# Linux (在服务器执行)
mkdir -p ai/bin/katago
cd ai/bin/katago

# 下载KataGo (选择对应CPU版本)
wget https://github.com/lightvector/KataGo/releases/latest/download/katago-v1.14.1-linux-x64.zip
unzip katago-v1.14.1-linux-x64.zip
chmod +x katago

# 下载小模型 (b6, 约15MB)
wget https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz
mv g170e-b6c96-s175395328-d26788732.bin.gz b6.bin.gz

# 创建配置文件
cat > config.cfg << 'EOF'
logSearchInfo = false
maxVisits = 100
numSearchThreads = 1
EOF
```

#### 3.2 创建GTP适配器

```javascript
// ai/katago-adapter.js

const { spawn } = require('child_process');
const path = require('path');

class KataGoAdapter {
    constructor() {
        this.process = null;
        this.ready = false;
        this.pendingCallback = null;
        this.buffer = '';
    }

    start() {
        const binDir = path.join(__dirname, 'bin/katago');
        const enginePath = process.platform === 'win32'
            ? path.join(binDir, 'katago.exe')
            : path.join(binDir, 'katago');

        this.process = spawn(enginePath, [
            'gtp',
            '-model', path.join(binDir, 'b6.bin.gz'),
            '-config', path.join(binDir, 'config.cfg')
        ]);

        this.process.stdout.on('data', (data) => {
            this.buffer += data.toString();
            this.processBuffer();
        });

        this.process.stderr.on('data', (data) => {
            console.log('[KataGo]', data.toString());
        });
    }

    send(command) {
        if (this.process) {
            this.process.stdin.write(command + '\n');
        }
    }

    processBuffer() {
        // GTP响应以双换行结束
        const parts = this.buffer.split('\n\n');
        if (parts.length > 1) {
            const response = parts[0].trim();
            this.buffer = parts.slice(1).join('\n\n');

            if (this.pendingCallback) {
                // 解析GTP响应，格式为 "= D4" 或 "= pass"
                const match = response.match(/^=\s*(\S+)/);
                if (match) {
                    this.pendingCallback(match[1]);
                }
                this.pendingCallback = null;
            }
        }
    }

    // 设置棋盘大小
    setBoardSize(size) {
        this.send(`boardsize ${size}`);
        this.send('clear_board');
    }

    // 落子
    play(color, move) {
        // color: 'B' 或 'W'
        // move: 'D4' 或 'pass'
        this.send(`play ${color} ${move}`);
    }

    // 获取AI着法
    async genMove(color) {
        return new Promise((resolve) => {
            this.pendingCallback = resolve;
            this.send(`genmove ${color}`);
        });
    }

    // 悔棋
    undo() {
        this.send('undo');
    }

    stop() {
        if (this.process) {
            this.send('quit');
            this.process.kill();
            this.process = null;
        }
    }
}

module.exports = KataGoAdapter;
```

#### 3.3 坐标转换

```javascript
// GTP使用字母+数字坐标，如 "D4"（注意：没有I，跳过）
// 内部使用 [x][y] 数组索引

function boardToGtp(x, y, boardSize) {
    // GTP的x轴：A-H, J-T（跳过I）
    let letter = String.fromCharCode('A'.charCodeAt(0) + x);
    if (x >= 8) letter = String.fromCharCode('A'.charCodeAt(0) + x + 1);

    // GTP的y轴：1开始，从下往上
    const number = boardSize - y;

    return letter + number;
}

function gtpToBoard(gtp, boardSize) {
    let x = gtp.charCodeAt(0) - 'A'.charCodeAt(0);
    if (gtp.charCodeAt(0) > 'I'.charCodeAt(0)) x--;

    const y = boardSize - parseInt(gtp.slice(1));

    return { x, y };
}
```

#### 3.4 前端改动

```javascript
// public/games/weiqi/game.js

// 修改 doAiMove() 函数
async function doAiMove() {
    updateStatus('AI思考中...');

    ws.send(JSON.stringify({
        type: 'aiRequest',
        game: 'weiqi',
        moves: moveHistory,  // 发送历史着法
        boardSize: size
    }));
}

// 在WebSocket消息处理中添加
case 'aiResponse':
    if (msg.move === 'pass') {
        // AI停一手
        addChatMessage('AI', '停一手');
    } else {
        placeStone(msg.x, msg.y, 2);
    }
    currentPlayer = 0;
    updateStatus();
    draw();
    break;
```

---

### 阶段4：服务端集成

**工作量**：0.5天

#### 4.1 引擎管理器

```javascript
// ai/engine-manager.js

const KataGoAdapter = require('./katago-adapter');
const PikafishAdapter = require('./pikafish-adapter');

class EngineManager {
    constructor() {
        this.katago = null;
        this.pikafish = null;
        this.katagoLastUsed = 0;
        this.pikafishLastUsed = 0;

        // 空闲30秒后关闭引擎
        this.idleTimeout = 30000;

        setInterval(() => this.checkIdle(), 10000);
    }

    async getKataGo() {
        if (!this.katago) {
            this.katago = new KataGoAdapter();
            this.katago.start();
            // 等待引擎就绪
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        this.katagoLastUsed = Date.now();
        return this.katago;
    }

    async getPikafish() {
        if (!this.pikafish) {
            this.pikafish = new PikafishAdapter();
            this.pikafish.start();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.pikafishLastUsed = Date.now();
        return this.pikafish;
    }

    checkIdle() {
        const now = Date.now();

        if (this.katago && now - this.katagoLastUsed > this.idleTimeout) {
            console.log('[EngineManager] 关闭空闲的KataGo');
            this.katago.stop();
            this.katago = null;
        }

        if (this.pikafish && now - this.pikafishLastUsed > this.idleTimeout) {
            console.log('[EngineManager] 关闭空闲的Pikafish');
            this.pikafish.stop();
            this.pikafish = null;
        }
    }

    shutdown() {
        if (this.katago) this.katago.stop();
        if (this.pikafish) this.pikafish.stop();
    }
}

module.exports = new EngineManager();
```

#### 4.2 修改server.js

```javascript
// server.js 添加以下内容

const engineManager = require('./ai/engine-manager');

// 在WebSocket消息处理中添加
case 'aiRequest':
    handleAiRequest(ws, msg);
    break;

async function handleAiRequest(ws, msg) {
    try {
        if (msg.game === 'chess') {
            const pikafish = await engineManager.getPikafish();
            const uciMove = await pikafish.getMove(msg.fen, 10);

            // 转换UCI着法为坐标
            const from = uciToBoard(uciMove.slice(0, 2));
            const to = uciToBoard(uciMove.slice(2, 4));

            ws.send(JSON.stringify({
                type: 'aiResponse',
                move: {
                    fromX: from.x, fromY: from.y,
                    toX: to.x, toY: to.y
                }
            }));
        }
        else if (msg.game === 'weiqi') {
            const katago = await engineManager.getKataGo();

            // 设置棋盘并重放历史
            katago.setBoardSize(msg.boardSize);
            for (const move of msg.moves) {
                const gtp = boardToGtp(move.x, move.y, msg.boardSize);
                katago.play(move.color === 1 ? 'B' : 'W', gtp);
            }

            // 获取AI着法
            const gtpMove = await katago.genMove('W');

            if (gtpMove.toLowerCase() === 'pass') {
                ws.send(JSON.stringify({ type: 'aiResponse', move: 'pass' }));
            } else {
                const pos = gtpToBoard(gtpMove, msg.boardSize);
                ws.send(JSON.stringify({
                    type: 'aiResponse',
                    x: pos.x,
                    y: pos.y
                }));
            }
        }
    } catch (err) {
        console.error('[AI Error]', err);
        ws.send(JSON.stringify({ type: 'aiError', message: '引擎错误' }));
    }
}

// 服务器关闭时清理
process.on('SIGTERM', () => {
    engineManager.shutdown();
    process.exit(0);
});
```

---

## 四、部署步骤

### 4.1 上传引擎文件

```bash
# 在服务器上
cd /path/to/weiqi
mkdir -p ai/bin/{katago,pikafish}

# 下载并配置KataGo
cd ai/bin/katago
wget https://github.com/lightvector/KataGo/releases/download/v1.14.1/katago-v1.14.1-linux-x64.zip
unzip katago-v1.14.1-linux-x64.zip
wget https://github.com/lightvector/KataGo/releases/download/v1.4.5/g170e-b6c96-s175395328-d26788732.bin.gz -O b6.bin.gz
chmod +x katago

# 创建KataGo配置
cat > config.cfg << 'EOF'
logSearchInfo = false
maxVisits = 100
numSearchThreads = 1
EOF

# 下载并配置Pikafish
cd ../pikafish
wget https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-bmi2
chmod +x pikafish-bmi2
mv pikafish-bmi2 pikafish
```

### 4.2 测试引擎

```bash
# 测试KataGo
cd ai/bin/katago
echo -e "boardsize 9\ngenmove b\nquit" | ./katago gtp -model b6.bin.gz -config config.cfg

# 测试Pikafish
cd ../pikafish
echo -e "uci\nisready\nposition startpos\ngo depth 5\nquit" | ./pikafish
```

### 4.3 重启服务

```bash
# 如果使用Docker
./deploy.sh

# 如果直接运行
npm start
```

---

## 五、性能调优

### 5.1 KataGo参数调整

```cfg
# ai/bin/katago/config.cfg

# 降低搜索次数可加快响应（牺牲棋力）
maxVisits = 50          # 默认100，可降到50

# 单线程，避免CPU占用过高
numSearchThreads = 1

# 禁用日志
logSearchInfo = false
```

### 5.2 Pikafish参数调整

```javascript
// 在pikafish-adapter.js中

// 限制搜索深度
this.send('setoption name Threads value 1');  // 单线程
this.send('setoption name Hash value 32');    // 32MB哈希表

// getMove时限制深度
await pikafish.getMove(fen, 8);  // 深度8，响应更快
```

### 5.3 并发限制

```javascript
// ai/engine-manager.js

// 添加并发控制
this.katagoQueue = [];
this.katagoProcessing = false;

async getKataGoMove(params) {
    return new Promise((resolve) => {
        this.katagoQueue.push({ params, resolve });
        this.processKatagoQueue();
    });
}

async processKatagoQueue() {
    if (this.katagoProcessing || this.katagoQueue.length === 0) return;

    this.katagoProcessing = true;
    const { params, resolve } = this.katagoQueue.shift();

    const katago = await this.getKataGo();
    const result = await katago.genMove(params);
    resolve(result);

    this.katagoProcessing = false;
    this.processKatagoQueue();
}
```

---

## 六、监控与日志

### 6.1 添加日志

```javascript
// ai/engine-manager.js

console.log(`[${new Date().toISOString()}] KataGo启动`);
console.log(`[${new Date().toISOString()}] Pikafish请求: ${fen}`);
console.log(`[${new Date().toISOString()}] AI响应: ${move}, 耗时${elapsed}ms`);
```

### 6.2 内存监控

```bash
# 查看内存使用
ps aux | grep -E 'node|katago|pikafish'

# 持续监控
watch -n 5 'free -m && ps aux | grep -E "node|katago|pikafish" | grep -v grep'
```

---

## 七、回退方案

如果引擎出现问题，可快速回退到原有规则AI：

```javascript
// 在前端game.js中添加开关
const USE_SERVER_AI = true;

async function doAiMove() {
    if (USE_SERVER_AI) {
        // 请求服务端AI
        ws.send(...);
    } else {
        // 使用本地规则AI
        const move = aiMove();
        // ...
    }
}
```

---

## 八、检查清单

### 部署前
- [ ] 下载KataGo可执行文件和模型
- [ ] 下载Pikafish可执行文件
- [ ] 测试引擎命令行运行正常
- [ ] 创建ai/目录结构

### 代码修改
- [ ] 创建 `ai/engine-manager.js`
- [ ] 创建 `ai/katago-adapter.js`
- [ ] 创建 `ai/pikafish-adapter.js`
- [ ] 修改 `server.js` 添加AI请求处理
- [ ] 修改 `public/games/weiqi/game.js`
- [ ] 修改 `public/games/chess/game.js`
- [ ] 优化 `public/games/gomoku/game.js`

### 部署后
- [ ] 测试围棋AI对弈
- [ ] 测试象棋AI对弈
- [ ] 测试五子棋AI对弈
- [ ] 监控内存使用
- [ ] 检查引擎自动关闭功能

---

## 九、预期效果

| 游戏 | 改进前 | 改进后 |
|------|--------|--------|
| 围棋 | 入门级规则AI | 业余高段水平 |
| 象棋 | 2层Minimax | 专业级水平 |
| 五子棋 | 简单评估 | 业余高手水平 |

| 指标 | 预期值 |
|------|--------|
| 围棋响应时间 | 2-5秒 |
| 象棋响应时间 | <1秒 |
| 五子棋响应时间 | <0.5秒 |
| 内存峰值 | ~1GB |
| 硬盘占用 | ~100MB |
