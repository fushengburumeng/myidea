/**
 * KataGo Worker线程
 * 在独立线程中运行KataGo引擎
 */

const { parentPort } = require('worker_threads');
const { KataGoAdapter, CoordinateUtils } = require('./katago-adapter');

let katago = null;
let isReady = false;

// 启动KataGo引擎
async function init() {
    try {
        console.log('[KataGo Worker] 启动引擎...');
        katago = new KataGoAdapter();
        katago.start();

        // 等待引擎就绪
        await katago.waitReady(30000);

        isReady = true;
        console.log('[KataGo Worker] 引擎已就绪');

        // 通知主线程已就绪
        parentPort.postMessage({ type: 'ready' });
    } catch (err) {
        console.error('[KataGo Worker] 初始化失败:', err);
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

    const { boardSize, moves } = data;

    try {
        const startTime = Date.now();

        // 设置棋盘大小并清空
        await katago.setBoardSize(boardSize);
        await katago.clearBoard();

        // 重放历史着法
        for (const move of moves) {
            const gtp = CoordinateUtils.boardToGtp(move.x, move.y, boardSize);
            const color = move.color === 1 ? 'B' : 'W';
            await katago.play(color, gtp);
        }

        // 获取AI着法（AI执白）
        const gtpMove = await katago.genMove('W');

        const elapsed = Date.now() - startTime;
        console.log(`[KataGo Worker] 响应: ${gtpMove}, 耗时${elapsed}ms`);

        // 返回结果
        if (gtpMove.toLowerCase() === 'pass') {
            parentPort.postMessage({
                type: 'result',
                data: { pass: true }
            });
        } else {
            const pos = CoordinateUtils.gtpToBoard(gtpMove, boardSize);
            parentPort.postMessage({
                type: 'result',
                data: pos
            });
        }
    } catch (err) {
        console.error('[KataGo Worker] 处理任务失败:', err);
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
            if (katago) {
                katago.stop();
            }
            process.exit(0);
            break;
    }
});

// 启动
init();
