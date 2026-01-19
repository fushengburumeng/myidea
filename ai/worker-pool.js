/**
 * Worker线程池管理器
 * 管理AI引擎Worker的生命周期和任务分配
 */

const { Worker } = require('worker_threads');
const path = require('path');

class WorkerPool {
    constructor(workerScript, poolSize = 3) {
        this.workerScript = workerScript;
        this.poolSize = poolSize;
        this.workers = [];
        this.taskQueue = [];
        this.nextWorkerId = 0;
    }

    /**
     * 初始化Worker池
     */
    async init() {
        console.log(`[WorkerPool] 初始化 ${this.poolSize} 个Worker: ${path.basename(this.workerScript)}`);

        for (let i = 0; i < this.poolSize; i++) {
            await this.createWorker(i);
        }
    }

    /**
     * 创建单个Worker
     */
    async createWorker(id) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(this.workerScript);

            const workerInfo = {
                id,
                worker,
                busy: false,
                currentTask: null,
                lastUsed: Date.now()
            };

            worker.on('message', (msg) => {
                if (msg.type === 'ready') {
                    console.log(`[WorkerPool] Worker ${id} 已就绪`);
                    this.workers.push(workerInfo);
                    resolve(workerInfo);
                } else if (msg.type === 'result') {
                    this.handleResult(workerInfo, msg);
                } else if (msg.type === 'error') {
                    this.handleError(workerInfo, msg);
                }
            });

            worker.on('error', (err) => {
                console.error(`[WorkerPool] Worker ${id} 错误:`, err);
                if (workerInfo.currentTask) {
                    workerInfo.currentTask.reject(err);
                }
                this.removeWorker(workerInfo);
                reject(err);
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`[WorkerPool] Worker ${id} 异常退出: ${code}`);
                }
                this.removeWorker(workerInfo);
            });

            // 30秒超时
            setTimeout(() => {
                if (!this.workers.includes(workerInfo)) {
                    reject(new Error(`Worker ${id} 初始化超时`));
                    worker.terminate();
                }
            }, 30000);
        });
    }

    /**
     * 处理Worker返回结果
     */
    handleResult(workerInfo, msg) {
        if (workerInfo.currentTask) {
            workerInfo.currentTask.resolve(msg.data);
            workerInfo.currentTask = null;
        }
        workerInfo.busy = false;
        workerInfo.lastUsed = Date.now();

        // 处理队列中的下一个任务
        this.processQueue();
    }

    /**
     * 处理Worker错误
     */
    handleError(workerInfo, msg) {
        if (workerInfo.currentTask) {
            workerInfo.currentTask.reject(new Error(msg.error));
            workerInfo.currentTask = null;
        }
        workerInfo.busy = false;
        workerInfo.lastUsed = Date.now();

        // 处理队列中的下一个任务
        this.processQueue();
    }

    /**
     * 移除Worker
     */
    removeWorker(workerInfo) {
        const index = this.workers.indexOf(workerInfo);
        if (index !== -1) {
            this.workers.splice(index, 1);
        }
    }

    /**
     * 获取空闲Worker
     */
    getAvailableWorker() {
        return this.workers.find(w => !w.busy);
    }

    /**
     * 执行任务
     */
    async execute(taskData) {
        return new Promise((resolve, reject) => {
            const task = { taskData, resolve, reject };

            const worker = this.getAvailableWorker();
            if (worker) {
                this.assignTask(worker, task);
            } else {
                // 所有Worker都忙，加入队列
                this.taskQueue.push(task);
            }
        });
    }

    /**
     * 分配任务给Worker
     */
    assignTask(workerInfo, task) {
        workerInfo.busy = true;
        workerInfo.currentTask = task;
        workerInfo.worker.postMessage({
            type: 'task',
            data: task.taskData
        });
    }

    /**
     * 处理队列
     */
    processQueue() {
        if (this.taskQueue.length === 0) return;

        const worker = this.getAvailableWorker();
        if (worker) {
            const task = this.taskQueue.shift();
            this.assignTask(worker, task);
        }
    }

    /**
     * 获取池状态
     */
    getStatus() {
        return {
            poolSize: this.poolSize,
            activeWorkers: this.workers.length,
            busyWorkers: this.workers.filter(w => w.busy).length,
            queueLength: this.taskQueue.length,
            isFull: this.workers.every(w => w.busy)
        };
    }

    /**
     * 检查池是否已满
     */
    isFull() {
        return this.workers.length > 0 && this.workers.every(w => w.busy);
    }

    /**
     * 关闭所有Worker
     */
    async shutdown() {
        console.log(`[WorkerPool] 关闭所有Worker`);

        // 拒绝队列中的所有任务
        for (const task of this.taskQueue) {
            task.reject(new Error('Worker池正在关闭'));
        }
        this.taskQueue = [];

        // 终止所有Worker
        const promises = this.workers.map(w => {
            return new Promise((resolve) => {
                w.worker.once('exit', resolve);
                w.worker.postMessage({ type: 'shutdown' });

                // 5秒后强制终止
                setTimeout(() => {
                    w.worker.terminate();
                    resolve();
                }, 5000);
            });
        });

        await Promise.all(promises);
        this.workers = [];
    }
}

module.exports = WorkerPool;
