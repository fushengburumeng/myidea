// AI逻辑
class GoAI {
    constructor(game, difficulty = 'medium') {
        this.game = game;
        this.difficulty = difficulty;
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }

    // 获取AI落子
    getMove() {
        const moves = this.game.getLegalMoves();
        if (moves.length === 0) return null;

        // 简单难度：较大随机性
        if (this.difficulty === 'easy') {
            if (Math.random() < 0.4) {
                return moves[Math.floor(Math.random() * moves.length)];
            }
        }

        // 评估每个落子点
        const scored = moves.map(([x, y]) => ({
            x, y,
            score: this.evaluateMove(x, y)
        }));

        scored.sort((a, b) => b.score - a.score);

        // 根据难度选择落子
        let topCount;
        if (this.difficulty === 'easy') topCount = 5;
        else if (this.difficulty === 'medium') topCount = 3;
        else topCount = 1; // hard

        const topMoves = scored.slice(0, Math.min(topCount, scored.length));
        const choice = topMoves[Math.floor(Math.random() * topMoves.length)];

        return [choice.x, choice.y];
    }

    evaluateMove(x, y) {
        let score = 0;
        const player = this.game.currentPlayer;
        const opponent = player === 1 ? 2 : 1;

        const tempBoard = this.game.board.map(row => [...row]);
        tempBoard[x][y] = player;

        // 难度系数
        const weights = {
            easy: { capture: 30, defense: 15, influence: 5, bigPoint: 2, corner: 1 },
            medium: { capture: 50, defense: 30, influence: 10, bigPoint: 5, corner: 2 },
            hard: { capture: 80, defense: 50, influence: 20, bigPoint: 10, corner: 3 }
        }[this.difficulty];

        score += this.getCaptureScore(x, y, tempBoard, player, opponent) * weights.capture;
        score += this.getDefenseScore(x, y, player) * weights.defense;
        score += this.getInfluenceScore(x, y) * weights.influence;
        score += this.getBigPointScore(x, y) * weights.bigPoint;

        if (this.isFillOwnEye(x, y, player)) {
            score -= 100;
        }

        if (this.game.history.length < 20) {
            score += this.getCornerEdgeScore(x, y) * weights.corner;
        }

        // 困难模式：额外考虑对手威胁
        if (this.difficulty === 'hard') {
            score += this.getAttackScore(x, y, opponent) * 40;
        }

        return score;
    }

    getAttackScore(x, y, opponent) {
        let score = 0;
        for (const [nx, ny] of this.game.getNeighbors(x, y)) {
            if (this.game.board[nx][ny] === opponent) {
                const group = this.game.getGroup(nx, ny);
                if (group.liberties.length <= 3) {
                    score += (4 - group.liberties.length) * group.stones.length;
                }
            }
        }
        return score;
    }

    getCaptureScore(x, y, tempBoard, player, opponent) {
        let captures = 0;
        for (const [nx, ny] of this.game.getNeighbors(x, y)) {
            if (this.game.board[nx][ny] === opponent) {
                const group = this.game.getGroup(nx, ny);
                if (group.liberties.length === 1 &&
                    group.liberties[0][0] === x && group.liberties[0][1] === y) {
                    captures += group.stones.length;
                }
            }
        }
        return captures;
    }

    getDefenseScore(x, y, player) {
        let score = 0;
        for (const [nx, ny] of this.game.getNeighbors(x, y)) {
            if (this.game.board[nx][ny] === player) {
                const group = this.game.getGroup(nx, ny);
                if (group.liberties.length <= 2) {
                    score += (3 - group.liberties.length) * group.stones.length;
                }
            }
        }
        return score;
    }

    getInfluenceScore(x, y) {
        let friendlyNeighbors = 0;
        let emptyNeighbors = 0;
        const player = this.game.currentPlayer;

        for (const [nx, ny] of this.game.getNeighbors(x, y)) {
            if (this.game.board[nx][ny] === player) friendlyNeighbors++;
            if (this.game.board[nx][ny] === 0) emptyNeighbors++;
        }

        return emptyNeighbors + friendlyNeighbors * 0.5;
    }

    getBigPointScore(x, y) {
        const size = this.game.size;
        const center = Math.floor(size / 2);

        // 星位和天元加分
        const starPoints = this.getStarPoints();
        for (const [sx, sy] of starPoints) {
            if (x === sx && y === sy && this.game.board[x][y] === 0) {
                return 3;
            }
        }

        // 靠近中心加分
        const distToCenter = Math.abs(x - center) + Math.abs(y - center);
        return Math.max(0, (size - distToCenter) / size);
    }

    getStarPoints() {
        const size = this.game.size;
        if (size === 19) {
            return [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]];
        } else if (size === 13) {
            return [[3,3],[3,9],[6,6],[9,3],[9,9]];
        } else {
            return [[2,2],[2,6],[4,4],[6,2],[6,6]];
        }
    }

    getCornerEdgeScore(x, y) {
        const size = this.game.size;
        const third = Math.floor(size / 3);

        // 角部区域
        const inCorner = (x < third || x >= size - third) && (y < third || y >= size - third);
        if (inCorner) return 2;

        // 边部区域
        const onEdge = x < third || x >= size - third || y < third || y >= size - third;
        if (onEdge) return 1;

        return 0;
    }

    isFillOwnEye(x, y, player) {
        const neighbors = this.game.getNeighbors(x, y);
        if (neighbors.length < 4) return false; // 边角不算眼

        let friendlyCount = 0;
        for (const [nx, ny] of neighbors) {
            if (this.game.board[nx][ny] === player) friendlyCount++;
        }

        return friendlyCount === neighbors.length;
    }
}
