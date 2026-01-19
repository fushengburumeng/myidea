/**
 * Pikafish Worker线程
 * 在独立线程中运行Pikafish引擎
 */

const { parentPort } = require('worker_threads');
const PikafishAdapter = require('./pikafish-adapter');

let pikafish = null;
let isReady = false;

// 启动Pikafish引擎
async function init() {
    try {
        console.log('[Pikafish Worker] 启动引擎...');
        pikafish = new PikafishAdapter();
        pikafish.start();

        // 等待引擎就绪
        await pikafish.waitReady(10000);

        isReady = true;
        console.log('[Pikafish Worker] 引擎已就绪');

        // 通知主线程已就绪
        parentPort.postMessage({ type: 'ready' });
    } catch (err) {
        console.error('[Pikafish Worker] 初始化失败:', err);
        parentPort.postMessage({
            type: 'error',
            error: err.message
        });
        process.exit(1);
    }
}

// 处理任务
async function handleTask(data) {
    if (!isReady) {
        throw new Error('引擎未就绪');
    }

    const { fen, depth } = data;

    try {
        const startTime = Date.now();

        const uciMove = await pikafish.getMove(fen, depth);

        const elapsed = Date.now() - startTime;
        console.log(`[Pikafish Worker] 响应: ${uciMove}, 耗时${elapsed}ms`);

        // 解析UCI着法
        // UCI坐标系：行号从下往上（0=红方底线，9=黑方底线）
        // 前端坐标系：行号从上往下（0=黑方底线，9=红方底线）
        // 转换公式：前端Y = 9 - UCI_Y
        const fromX = uciMove.charCodeAt(0) - 'a'.charCodeAt(0);
        const fromY_uci = parseInt(uciMove[1]);
        const toX = uciMove.charCodeAt(2) - 'a'.charCodeAt(0);
        const toY_uci = parseInt(uciMove[3]);

        // 转换Y坐标
        const fromY = 9 - fromY_uci;
        const toY = 9 - toY_uci;

        console.log(`[Pikafish Worker] UCI坐标: ${uciMove} -> UCI(${fromX},${fromY_uci}) to (${toX},${toY_uci})`);
        console.log(`[Pikafish Worker] 前端坐标: board[${fromY}][${fromX}] to board[${toY}][${toX}]`);

        // 返回结果
        parentPort.postMessage({
            type: 'result',
            data: {
                fromX, fromY,
                toX, toY
            }
        });
    } catch (err) {
        console.error('[Pikafish Worker] 处理任务失败:', err);
        parentPort.postMessage({
            type: 'error',
            error: err.message
        });
    }
}

// 监听主线程消息
parentPort.on('message', async (msg) => {
    switch (msg.type) {
        case 'task':
            await handleTask(msg.data);
            break;
        case 'shutdown':
            if (pikafish) {
                pikafish.stop();
            }
            process.exit(0);
            break;
    }
});

// 启动
init();
