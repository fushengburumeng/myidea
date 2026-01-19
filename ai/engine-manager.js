/**
 * AI引擎管理器
 * 负责引擎的生命周期管理和请求队列
 */

const { KataGoAdapter, CoordinateUtils } = require('./katago-adapter');
const PikafishAdapter = require('./pikafish-adapter');

class EngineManager {
    constructor() {
        this.katago = null;
        this.pikafish = null;
        this.katagoLastUsed = 0;
        this.pikafishLastUsed = 0;

        // 空闲300秒（5分钟）后关闭引擎，防止AI思考时被误判为空闲
        this.idleTimeout = 300000;

        // 请求队列（避免并发问题）
        this.katagoQueue = [];
        this.katagoProcessing = false;
        this.pikafishQueue = [];
        this.pikafishProcessing = false;

        // 定期检查空闲引擎
        this.idleChecker = setInterval(() => this.checkIdle(), 15000);

        // 检查引擎文件是否存在
        this.checkEngineFiles();
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
     * 获取KataGo实例
     */
    async getKataGo() {
        if (!this.katagoAvailable) {
            throw new Error('KataGo引擎文件不存在，请先下载引擎');
        }

        if (!this.katago) {
            console.log('[EngineManager] 启动KataGo...');
            this.katago = new KataGoAdapter();
            this.katago.start();
            // 等待引擎就绪
            await this.katago.waitReady(30000);
        }
        this.katagoLastUsed = Date.now();
        return this.katago;
    }

    /**
     * 获取Pikafish实例
     */
    async getPikafish() {
        if (!this.pikafishAvailable) {
            throw new Error('Pikafish引擎文件不存在，请先下载引擎');
        }

        if (!this.pikafish) {
            console.log('[EngineManager] 启动Pikafish...');
            this.pikafish = new PikafishAdapter();
            this.pikafish.start();
            // 等待引擎就绪
            await this.pikafish.waitReady(10000);
        }
        this.pikafishLastUsed = Date.now();
        return this.pikafish;
    }

    /**
     * 围棋AI请求（队列处理）
     */
    async getWeiqiMove(params) {
        return new Promise((resolve, reject) => {
            this.katagoQueue.push({ params, resolve, reject });
            this.processKatagoQueue();
        });
    }

    async processKatagoQueue() {
        if (this.katagoProcessing || this.katagoQueue.length === 0) return;

        this.katagoProcessing = true;
        const { params, resolve, reject } = this.katagoQueue.shift();

        try {
            const katago = await this.getKataGo();
            const startTime = Date.now();

            // 设置棋盘大小并清空
            await katago.setBoardSize(params.boardSize);
            await katago.clearBoard();

            // 重放历史着法
            for (const move of params.moves) {
                const gtp = CoordinateUtils.boardToGtp(move.x, move.y, params.boardSize);
                const color = move.color === 1 ? 'B' : 'W';
                await katago.play(color, gtp);
            }

            // 获取AI着法（AI执白）
            const gtpMove = await katago.genMove('W');

            const elapsed = Date.now() - startTime;
            console.log(`[EngineManager] KataGo响应: ${gtpMove}, 耗时${elapsed}ms`);

            if (gtpMove.toLowerCase() === 'pass') {
                resolve({ pass: true });
            } else {
                const pos = CoordinateUtils.gtpToBoard(gtpMove, params.boardSize);
                resolve(pos);
            }
        } catch (err) {
            console.error('[EngineManager] KataGo错误:', err);
            reject(err);
        } finally {
            this.katagoProcessing = false;
            // 处理下一个请求
            this.processKatagoQueue();
        }
    }

    /**
     * 象棋AI请求（队列处理）
     */
    async getChessMove(fen, depth = 10) {
        return new Promise((resolve, reject) => {
            this.pikafishQueue.push({ fen, depth, resolve, reject });
            this.processPikafishQueue();
        });
    }

    async processPikafishQueue() {
        if (this.pikafishProcessing || this.pikafishQueue.length === 0) return;

        this.pikafishProcessing = true;
        const { fen, depth, resolve, reject } = this.pikafishQueue.shift();

        try {
            const pikafish = await this.getPikafish();
            const startTime = Date.now();

            const uciMove = await pikafish.getMove(fen, depth);

            const elapsed = Date.now() - startTime;
            console.log(`[EngineManager] Pikafish响应: ${uciMove}, 耗时${elapsed}ms`);

            // 解析UCI着法
            const fromX = uciMove.charCodeAt(0) - 'a'.charCodeAt(0);
            const fromY = parseInt(uciMove[1]);
            const toX = uciMove.charCodeAt(2) - 'a'.charCodeAt(0);
            const toY = parseInt(uciMove[3]);

            resolve({
                fromX, fromY,
                toX, toY
            });
        } catch (err) {
            console.error('[EngineManager] Pikafish错误:', err);
            reject(err);
        } finally {
            this.pikafishProcessing = false;
            // 处理下一个请求
            this.processPikafishQueue();
        }
    }

    /**
     * 检查并关闭空闲引擎
     */
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

    /**
     * 获取引擎状态
     */
    getStatus() {
        return {
            katago: {
                available: this.katagoAvailable,
                running: this.katago !== null,
                queueLength: this.katagoQueue.length
            },
            pikafish: {
                available: this.pikafishAvailable,
                running: this.pikafish !== null,
                queueLength: this.pikafishQueue.length
            }
        };
    }

    /**
     * 关闭所有引擎
     */
    shutdown() {
        console.log('[EngineManager] 关闭所有引擎');
        clearInterval(this.idleChecker);
        if (this.katago) {
            this.katago.stop();
            this.katago = null;
        }
        if (this.pikafish) {
            this.pikafish.stop();
            this.pikafish = null;
        }
    }
}

// 导出单例
module.exports = new EngineManager();
