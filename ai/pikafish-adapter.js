/**
 * Pikafish UCI协议适配器
 * 用于中国象棋AI
 */

const { spawn } = require('child_process');
const path = require('path');

class PikafishAdapter {
    constructor() {
        this.process = null;
        this.ready = false;
        this.pendingCallback = null;
        this.buffer = '';
    }

    start() {
        const enginePath = process.platform === 'win32'
            ? path.join(__dirname, 'bin/pikafish/pikafish.exe')
            : path.join(__dirname, 'bin/pikafish/pikafish');

        console.log('[Pikafish] 启动引擎:', enginePath);

        try {
            this.process = spawn(enginePath);

            this.process.stdout.on('data', (data) => {
                this.buffer += data.toString();
                this.handleOutput();
            });

            this.process.stderr.on('data', (data) => {
                console.log('[Pikafish stderr]', data.toString());
            });

            this.process.on('error', (err) => {
                console.error('[Pikafish] 进程错误:', err);
            });

            this.process.on('exit', (code) => {
                console.log('[Pikafish] 进程退出, code:', code);
                this.ready = false;
            });

            // 初始化UCI
            this.send('uci');
        } catch (err) {
            console.error('[Pikafish] 启动失败:', err);
        }
    }

    send(command) {
        if (this.process && this.process.stdin.writable) {
            console.log('[Pikafish] 发送:', command);
            this.process.stdin.write(command + '\n');
        }
    }

    handleOutput() {
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            console.log('[Pikafish] 接收:', trimmed);

            if (trimmed === 'uciok') {
                // UCI初始化完成，配置引擎
                this.send('setoption name Threads value 1');
                this.send('setoption name Hash value 64');
                this.send('isready');
            }

            if (trimmed === 'readyok') {
                this.ready = true;
                console.log('[Pikafish] 引擎就绪');
            }

            if (trimmed.startsWith('bestmove')) {
                const parts = trimmed.split(' ');
                const move = parts[1];
                if (this.pendingCallback) {
                    this.pendingCallback(move);
                    this.pendingCallback = null;
                }
            }
        }
    }

    /**
     * 获取AI着法
     * @param {string} fen - 象棋局面FEN字符串
     * @param {number} depth - 搜索深度
     * @returns {Promise<string>} UCI格式着法，如 "h2e2"
     */
    async getMove(fen, depth = 10) {
        return new Promise((resolve, reject) => {
            if (!this.ready) {
                reject(new Error('引擎未就绪'));
                return;
            }

            const timeout = setTimeout(() => {
                this.pendingCallback = null;
                reject(new Error('引擎响应超时'));
            }, 30000);

            this.pendingCallback = (move) => {
                clearTimeout(timeout);
                resolve(move);
            };

            this.send(`position fen ${fen}`);
            this.send(`go depth ${depth}`);
        });
    }

    /**
     * 等待引擎就绪
     */
    async waitReady(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (this.ready) {
                resolve();
                return;
            }

            const startTime = Date.now();
            const check = () => {
                if (this.ready) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('等待引擎就绪超时'));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    stop() {
        if (this.process) {
            console.log('[Pikafish] 关闭引擎');
            this.send('quit');
            setTimeout(() => {
                if (this.process) {
                    this.process.kill();
                    this.process = null;
                }
            }, 1000);
            this.ready = false;
        }
    }
}

module.exports = PikafishAdapter;
