/**
 * KataGo GTP协议适配器
 * 用于围棋AI
 */

const { spawn } = require('child_process');
const path = require('path');

class KataGoAdapter {
    constructor() {
        this.process = null;
        this.ready = false;
        this.pendingCallback = null;
        this.buffer = '';
        this.commandId = 0;
    }

    start() {
        const binDir = path.join(__dirname, 'bin/katago');
        const enginePath = process.platform === 'win32'
            ? path.join(binDir, 'katago.exe')
            : path.join(binDir, 'katago');

        const modelPath = path.join(binDir, 'b6.bin.gz');
        const configPath = path.join(binDir, 'config.cfg');

        console.log('[KataGo] 启动引擎:', enginePath);
        console.log('[KataGo] 模型路径:', modelPath);
        console.log('[KataGo] 配置路径:', configPath);

        try {
            this.process = spawn(enginePath, [
                'gtp',
                '-model', modelPath,
                '-config', configPath
            ]);

            this.process.stdout.on('data', (data) => {
                this.buffer += data.toString();
                this.processBuffer();
            });

            this.process.stderr.on('data', (data) => {
                const msg = data.toString();
                // KataGo的正常日志也会输出到stderr
                if (msg.includes('GTP ready')) {
                    this.ready = true;
                    console.log('[KataGo] 引擎就绪');
                }
                console.log('[KataGo stderr]', msg.trim());
            });

            this.process.on('error', (err) => {
                console.error('[KataGo] 进程错误:', err);
            });

            this.process.on('exit', (code) => {
                console.log('[KataGo] 进程退出, code:', code);
                this.ready = false;
            });

        } catch (err) {
            console.error('[KataGo] 启动失败:', err);
        }
    }

    send(command) {
        if (this.process && this.process.stdin.writable) {
            console.log('[KataGo] 发送:', command);
            this.process.stdin.write(command + '\n');
        }
    }

    processBuffer() {
        // GTP响应以双换行结束
        const parts = this.buffer.split('\n\n');
        if (parts.length > 1) {
            for (let i = 0; i < parts.length - 1; i++) {
                const response = parts[i].trim();
                if (response) {
                    console.log('[KataGo] 接收:', response);
                    this.handleResponse(response);
                }
            }
            this.buffer = parts[parts.length - 1];
        }
    }

    handleResponse(response) {
        if (this.pendingCallback) {
            // 解析GTP响应，格式为 "= D4" 或 "= pass" 或 "? error message"
            const match = response.match(/^[=?]\s*(.*)/);
            if (match) {
                const result = match[1].trim();
                const isError = response.startsWith('?');
                if (isError) {
                    this.pendingCallback({ error: result });
                } else {
                    this.pendingCallback({ result });
                }
            }
            this.pendingCallback = null;
        }
    }

    /**
     * 发送命令并等待响应
     */
    async sendCommand(command) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingCallback = null;
                reject(new Error('命令响应超时: ' + command));
            }, 30000);

            this.pendingCallback = (response) => {
                clearTimeout(timeout);
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response.result);
                }
            };

            this.send(command);
        });
    }

    /**
     * 设置棋盘大小
     */
    async setBoardSize(size) {
        await this.sendCommand(`boardsize ${size}`);
    }

    /**
     * 清空棋盘
     */
    async clearBoard() {
        await this.sendCommand('clear_board');
    }

    /**
     * 落子
     * @param {string} color - 'B' 或 'W'
     * @param {string} move - GTP格式坐标如 'D4' 或 'pass'
     */
    async play(color, move) {
        await this.sendCommand(`play ${color} ${move}`);
    }

    /**
     * 获取AI着法
     * @param {string} color - 'B' 或 'W'
     * @returns {Promise<string>} GTP格式坐标如 'D4' 或 'pass'
     */
    async genMove(color) {
        const result = await this.sendCommand(`genmove ${color}`);
        return result;
    }

    /**
     * 悔棋
     */
    async undo() {
        await this.sendCommand('undo');
    }

    /**
     * 等待引擎就绪
     */
    async waitReady(timeout = 30000) {
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
                    setTimeout(check, 500);
                }
            };
            check();
        });
    }

    stop() {
        if (this.process) {
            console.log('[KataGo] 关闭引擎');
            this.send('quit');
            setTimeout(() => {
                if (this.process) {
                    this.process.kill();
                    this.process = null;
                }
            }, 2000);
            this.ready = false;
        }
    }
}

// 坐标转换工具函数
const CoordinateUtils = {
    /**
     * 棋盘坐标转GTP坐标
     * @param {number} x - 棋盘x坐标 (0-18)
     * @param {number} y - 棋盘y坐标 (0-18)
     * @param {number} boardSize - 棋盘大小
     * @returns {string} GTP坐标如 "D4"
     */
    boardToGtp(x, y, boardSize) {
        // GTP的x轴：A-H, J-T（跳过I）
        let letter;
        if (x < 8) {
            letter = String.fromCharCode('A'.charCodeAt(0) + x);
        } else {
            letter = String.fromCharCode('A'.charCodeAt(0) + x + 1);
        }

        // GTP的y轴：1开始，从下往上
        const number = boardSize - y;

        return letter + number;
    },

    /**
     * GTP坐标转棋盘坐标
     * @param {string} gtp - GTP坐标如 "D4"
     * @param {number} boardSize - 棋盘大小
     * @returns {{x: number, y: number}} 棋盘坐标
     */
    gtpToBoard(gtp, boardSize) {
        if (gtp.toLowerCase() === 'pass') {
            return { pass: true };
        }

        const letterCode = gtp.toUpperCase().charCodeAt(0);
        let x = letterCode - 'A'.charCodeAt(0);
        if (letterCode > 'I'.charCodeAt(0)) {
            x--;
        }

        const y = boardSize - parseInt(gtp.slice(1));

        return { x, y };
    }
};

module.exports = { KataGoAdapter, CoordinateUtils };
