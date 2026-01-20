// 围棋游戏核心逻辑
class GoGame {
    constructor(size = 19) {
        this.size = size;
        this.board = [];
        this.currentPlayer = 1; // 1=黑, 2=白
        this.captures = { 1: 0, 2: 0 };
        this.history = [];
        this.koPoint = null;
        this.consecutivePasses = 0;
        this.gameOver = false;
        this.init();
    }

    init() {
        this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
        this.currentPlayer = 1;
        this.captures = { 1: 0, 2: 0 };
        this.history = [];
        this.koPoint = null;
        this.consecutivePasses = 0;
        this.gameOver = false;
    }

    // 获取相邻点
    getNeighbors(x, y) {
        const neighbors = [];
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                neighbors.push([nx, ny]);
            }
        }
        return neighbors;
    }

    // 获取连通的棋子群
    getGroup(x, y) {
        const color = this.board[x][y];
        if (color === 0) return { stones: [], liberties: [] };

        const visited = new Set();
        const stones = [];
        const liberties = new Set();
        const stack = [[x, y]];

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            const key = `${cx},${cy}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (this.board[cx][cy] === color) {
                stones.push([cx, cy]);
                for (const [nx, ny] of this.getNeighbors(cx, cy)) {
                    if (this.board[nx][ny] === 0) {
                        liberties.add(`${nx},${ny}`);
                    } else if (this.board[nx][ny] === color && !visited.has(`${nx},${ny}`)) {
                        stack.push([nx, ny]);
                    }
                }
            }
        }

        return {
            stones,
            liberties: Array.from(liberties).map(s => s.split(',').map(Number))
        };
    }

    // 计算某点的气
    getLiberties(x, y) {
        return this.getGroup(x, y).liberties;
    }

    // 检查是否可以落子
    canPlace(x, y, player = this.currentPlayer) {
        if (this.gameOver) return false;
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
        if (this.board[x][y] !== 0) return false;

        // 检查劫
        if (this.koPoint && this.koPoint[0] === x && this.koPoint[1] === y) {
            return false;
        }

        // 模拟落子
        const tempBoard = this.board.map(row => [...row]);
        tempBoard[x][y] = player;

        // 检查是否能提子
        const opponent = player === 1 ? 2 : 1;
        let captured = false;
        for (const [nx, ny] of this.getNeighbors(x, y)) {
            if (tempBoard[nx][ny] === opponent) {
                const group = this.getGroupOnBoard(tempBoard, nx, ny);
                if (group.liberties.length === 0) {
                    captured = true;
                    break;
                }
            }
        }

        // 如果能提子，则合法
        if (captured) return true;

        // 检查自杀
        const selfGroup = this.getGroupOnBoard(tempBoard, x, y);
        return selfGroup.liberties.length > 0;
    }

    // 在指定棋盘上获取棋群
    getGroupOnBoard(board, x, y) {
        const color = board[x][y];
        if (color === 0) return { stones: [], liberties: [] };

        const visited = new Set();
        const stones = [];
        const liberties = new Set();
        const stack = [[x, y]];

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            const key = `${cx},${cy}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (board[cx][cy] === color) {
                stones.push([cx, cy]);
                for (const [nx, ny] of this.getNeighbors(cx, cy)) {
                    if (board[nx][ny] === 0) {
                        liberties.add(`${nx},${ny}`);
                    } else if (board[nx][ny] === color && !visited.has(`${nx},${ny}`)) {
                        stack.push([nx, ny]);
                    }
                }
            }
        }

        return {
            stones,
            liberties: Array.from(liberties).map(s => s.split(',').map(Number))
        };
    }

    // 落子
    place(x, y) {
        if (!this.canPlace(x, y)) return false;

        // 保存历史
        this.history.push({
            board: this.board.map(row => [...row]),
            currentPlayer: this.currentPlayer,
            captures: { ...this.captures },
            koPoint: this.koPoint
        });

        this.board[x][y] = this.currentPlayer;
        this.consecutivePasses = 0;

        // 提子
        const opponent = this.currentPlayer === 1 ? 2 : 1;
        let capturedStones = [];

        for (const [nx, ny] of this.getNeighbors(x, y)) {
            if (this.board[nx][ny] === opponent) {
                const group = this.getGroup(nx, ny);
                if (group.liberties.length === 0) {
                    capturedStones = capturedStones.concat(group.stones);
                    for (const [sx, sy] of group.stones) {
                        this.board[sx][sy] = 0;
                    }
                }
            }
        }

        this.captures[this.currentPlayer] += capturedStones.length;

        // 检查劫
        if (capturedStones.length === 1) {
            const selfGroup = this.getGroup(x, y);
            if (selfGroup.stones.length === 1 && selfGroup.liberties.length === 1) {
                this.koPoint = capturedStones[0];
            } else {
                this.koPoint = null;
            }
        } else {
            this.koPoint = null;
        }

        this.currentPlayer = opponent;
        return true;
    }

    // 停一手
    pass() {
        this.history.push({
            board: this.board.map(row => [...row]),
            currentPlayer: this.currentPlayer,
            captures: { ...this.captures },
            koPoint: this.koPoint
        });

        this.consecutivePasses++;
        this.koPoint = null;

        if (this.consecutivePasses >= 2) {
            this.gameOver = true;
        }

        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }

    // 悔棋
    undo() {
        if (this.history.length === 0) return false;
        const state = this.history.pop();
        this.board = state.board;
        this.currentPlayer = state.currentPlayer;
        this.captures = state.captures;
        this.koPoint = state.koPoint;
        this.gameOver = false;
        this.consecutivePasses = 0;
        return true;
    }

    // 计算势力范围
    calculateInfluence() {
        const influence = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
        const distance = 4;

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                if (this.board[x][y] !== 0) {
                    const color = this.board[x][y];
                    const value = color === 1 ? 1 : -1;

                    for (let dx = -distance; dx <= distance; dx++) {
                        for (let dy = -distance; dy <= distance; dy++) {
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                                const dist = Math.abs(dx) + Math.abs(dy);
                                if (dist <= distance) {
                                    influence[nx][ny] += value * (distance - dist + 1) / (distance + 1);
                                }
                            }
                        }
                    }
                }
            }
        }

        return influence;
    }

    // 计算领地（简化版数目）
    calculateTerritory() {
        const territory = { 1: 0, 2: 0 };
        const visited = new Set();

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                if (this.board[x][y] === 0 && !visited.has(`${x},${y}`)) {
                    const region = [];
                    const borders = new Set();
                    const stack = [[x, y]];

                    while (stack.length > 0) {
                        const [cx, cy] = stack.pop();
                        const key = `${cx},${cy}`;
                        if (visited.has(key)) continue;
                        visited.add(key);

                        if (this.board[cx][cy] === 0) {
                            region.push([cx, cy]);
                            for (const [nx, ny] of this.getNeighbors(cx, cy)) {
                                if (this.board[nx][ny] === 0) {
                                    stack.push([nx, ny]);
                                } else {
                                    borders.add(this.board[nx][ny]);
                                }
                            }
                        }
                    }

                    if (borders.size === 1) {
                        const owner = borders.values().next().value;
                        territory[owner] += region.length;
                    }
                }
            }
        }

        return territory;
    }

    // 获取所有合法落子点
    getLegalMoves() {
        const moves = [];
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                if (this.canPlace(x, y)) {
                    moves.push([x, y]);
                }
            }
        }
        return moves;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoGame;
}
