/**
 * AI引擎管理器
 * 使用Worker线程池管理AI引擎
 */

const path = require('path');
const WorkerPool = require('./worker-pool');

class EngineManager {
    constructor() {
        // Worker线程池（每个池3个Worker）
        this.katagoPool = null;
        this.pikafishPool = null;

        // 检查引擎文件是否存在
        this.checkEngineFiles();

        // 如果引擎可用，初始化Worker池
        if (this.katagoAvailable) {
            this.initKatagoPool();
        }
        if (this.pikafishAvailable) {
            this.initPikafishPool();
        }
    }

    /**
     * 初始化KataGo Worker池
     */
    async initKatagoPool() {
        try {
            const workerScript = path.join(__dirname, 'katago-worker.js');
            this.katagoPool = new WorkerPool(workerScript, 3);
            await this.katagoPool.init();
            console.log('[EngineManager] KataGo Worker池已初始化');
        } catch (err) {
            console.error('[EngineManager] KataGo Worker池初始化失败:', err);
            this.katagoPool = null;
        }
    }

    /**
     * 初始化Pikafish Worker池
     */
    async initPikafishPool() {
        try {
            const workerScript = path.join(__dirname, 'pikafish-worker.js');
            this.pikafishPool = new WorkerPool(workerScript, 3);
            await this.pikafishPool.init();
            console.log('[EngineManager] Pikafish Worker池已初始化');
        } catch (err) {
            console.error('[EngineManager] Pikafish Worker池初始化失败:', err);
            this.pikafishPool = null;
        }
    }

    checkEngineFiles() {
        const fs = require('fs');
        const path = require('path');

        const katagoPath = process.platform === 'win32'
            ? path.join(__dirname, 'bin/katago/katago.exe')
            : path.join(__dirname, 'bin/katago/katago');

        const pikafishPath = process.platform === 'win32'
            ? path.join(__dirname, 'bin/pikafish/pikafish.exe')
            : path.join(__dirname, 'bin/pikafish/pikafish');

        this.katagoAvailable = fs.existsSync(katagoPath);
        this.pikafishAvailable = fs.existsSync(pikafishPath);

        console.log('[EngineManager] KataGo可用:', this.katagoAvailable, katagoPath);
        console.log('[EngineManager] Pikafish可用:', this.pikafishAvailable, pikafishPath);
    }

    /**
     * 围棋AI请求（使用Worker池）
     */
    async getWeiqiMove(params) {
        if (!this.katagoAvailable) {
            throw new Error('KataGo引擎文件不存在，请先下载引擎');
        }

        if (!this.katagoPool) {
            throw new Error('KataGo Worker池未初始化');
        }

        // 检查Worker池是否已满
        if (this.katagoPool.isFull()) {
            throw new Error('POOL_FULL');
        }

        try {
            const result = await this.katagoPool.execute({
                boardSize: params.boardSize,
                moves: params.moves
            });
            return result;
        } catch (err) {
            console.error('[EngineManager] KataGo错误:', err);
            throw err;
        }
    }

    /**
     * 象棋AI请求（使用Worker池）
     */
    async getChessMove(fen, depth = 10) {
        if (!this.pikafishAvailable) {
            throw new Error('Pikafish引擎文件不存在，请先下载引擎');
        }

        if (!this.pikafishPool) {
            throw new Error('Pikafish Worker池未初始化');
        }

        // 检查Worker池是否已满
        if (this.pikafishPool.isFull()) {
            throw new Error('POOL_FULL');
        }

        try {
            const result = await this.pikafishPool.execute({
                fen: fen,
                depth: depth
            });
            return result;
        } catch (err) {
            console.error('[EngineManager] Pikafish错误:', err);
            throw err;
        }
    }

    /**
     * 获取引擎状态
     */
    getStatus() {
        return {
            katago: {
                available: this.katagoAvailable,
                ...(this.katagoPool ? this.katagoPool.getStatus() : { running: false })
            },
            pikafish: {
                available: this.pikafishAvailable,
                ...(this.pikafishPool ? this.pikafishPool.getStatus() : { running: false })
            }
        };
    }

    /**
     * 关闭所有引擎
     */
    async shutdown() {
        console.log('[EngineManager] 关闭所有Worker池');

        const promises = [];

        if (this.katagoPool) {
            promises.push(this.katagoPool.shutdown());
        }

        if (this.pikafishPool) {
            promises.push(this.pikafishPool.shutdown());
        }

        await Promise.all(promises);

        this.katagoPool = null;
        this.pikafishPool = null;
    }
}

// 导出单例
module.exports = new EngineManager();
