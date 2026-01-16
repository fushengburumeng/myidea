// 棋盘渲染
class BoardRenderer {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = game;
        this.cellSize = 30;
        this.padding = 25;
        this.selectedStone = null;
        this.showLiberties = false;
        this.showInfluence = false;
        this.resize();
    }

    resize() {
        const size = this.game.size;
        const totalSize = (size - 1) * this.cellSize + this.padding * 2;
        this.canvas.width = totalSize;
        this.canvas.height = totalSize;
    }

    // 坐标转换：棋盘坐标 -> 画布坐标
    toCanvas(x, y) {
        return [
            this.padding + x * this.cellSize,
            this.padding + y * this.cellSize
        ];
    }

    // 坐标转换：画布坐标 -> 棋盘坐标
    toBoard(canvasX, canvasY) {
        const x = Math.round((canvasX - this.padding) / this.cellSize);
        const y = Math.round((canvasY - this.padding) / this.cellSize);
        if (x >= 0 && x < this.game.size && y >= 0 && y < this.game.size) {
            return [x, y];
        }
        return null;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBoard();
        if (this.showInfluence) this.drawInfluence();
        this.drawGrid();
        this.drawStarPoints();
        this.drawStones();
        if (this.showLiberties) this.drawAllLiberties();
    }

    drawBoard() {
        this.ctx.fillStyle = '#dcb35c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
        const size = this.game.size;
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < size; i++) {
            const [x1, y1] = this.toCanvas(i, 0);
            const [x2, y2] = this.toCanvas(i, size - 1);
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            const [x3, y3] = this.toCanvas(0, i);
            const [x4, y4] = this.toCanvas(size - 1, i);
            this.ctx.beginPath();
            this.ctx.moveTo(x3, y3);
            this.ctx.lineTo(x4, y4);
            this.ctx.stroke();
        }
    }

    drawStarPoints() {
        const size = this.game.size;
        let points = [];

        if (size === 19) {
            points = [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]];
        } else if (size === 13) {
            points = [[3,3],[3,9],[6,6],[9,3],[9,9]];
        } else if (size === 9) {
            points = [[2,2],[2,6],[4,4],[6,2],[6,6]];
        }

        this.ctx.fillStyle = '#000';
        for (const [x, y] of points) {
            const [cx, cy] = this.toCanvas(x, y);
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawStones() {
        for (let x = 0; x < this.game.size; x++) {
            for (let y = 0; y < this.game.size; y++) {
                const stone = this.game.board[x][y];
                if (stone !== 0) {
                    this.drawStone(x, y, stone);
                }
            }
        }
    }

    drawStone(x, y, color) {
        const [cx, cy] = this.toCanvas(x, y);
        const radius = this.cellSize * 0.45;

        // 阴影
        this.ctx.beginPath();
        this.ctx.arc(cx + 2, cy + 2, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fill();

        // 棋子
        const gradient = this.ctx.createRadialGradient(
            cx - radius * 0.3, cy - radius * 0.3, radius * 0.1,
            cx, cy, radius
        );

        if (color === 1) { // 黑子
            gradient.addColorStop(0, '#555');
            gradient.addColorStop(1, '#000');
        } else { // 白子
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ccc');
        }

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    drawAllLiberties() {
        const visited = new Set();
        const colors = [
            { stroke: '#e74c3c', fill: '#e74c3c', glow: 'rgba(231,76,60,0.4)' },   // 红 - 危险(1-2气)
            { stroke: '#f39c12', fill: '#f39c12', glow: 'rgba(243,156,18,0.3)' },  // 橙 - 警告(3-4气)
            { stroke: '#27ae60', fill: '#27ae60', glow: 'rgba(39,174,96,0.3)' },   // 绿 - 安全(5+气)
        ];

        for (let x = 0; x < this.game.size; x++) {
            for (let y = 0; y < this.game.size; y++) {
                const key = `${x},${y}`;
                if (this.game.board[x][y] !== 0 && !visited.has(key)) {
                    const group = this.game.getGroup(x, y);
                    group.stones.forEach(([sx, sy]) => visited.add(`${sx},${sy}`));

                    const libertyCount = group.liberties.length;
                    const colorSet = libertyCount <= 2 ? colors[0] : libertyCount <= 4 ? colors[1] : colors[2];

                    // 棋群发光效果
                    for (const [sx, sy] of group.stones) {
                        const [cx, cy] = this.toCanvas(sx, sy);
                        this.ctx.beginPath();
                        this.ctx.arc(cx, cy, this.cellSize * 0.55, 0, Math.PI * 2);
                        this.ctx.fillStyle = colorSet.glow;
                        this.ctx.fill();
                    }

                    // 棋群边框
                    this.ctx.strokeStyle = colorSet.stroke;
                    this.ctx.lineWidth = 3;
                    for (const [sx, sy] of group.stones) {
                        const [cx, cy] = this.toCanvas(sx, sy);
                        this.ctx.beginPath();
                        this.ctx.arc(cx, cy, this.cellSize * 0.48, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }

                    // 绘制气点
                    for (const [lx, ly] of group.liberties) {
                        const [cx, cy] = this.toCanvas(lx, ly);
                        this.ctx.fillStyle = colorSet.fill;
                        this.ctx.globalAlpha = 0.7;
                        this.ctx.beginPath();
                        this.ctx.arc(cx, cy, 5, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.globalAlpha = 1;
                    }

                    // 显示气数（在棋群中心棋子上）
                    const centerStone = group.stones[Math.floor(group.stones.length / 2)];
                    const [cx, cy] = this.toCanvas(centerStone[0], centerStone[1]);
                    this.ctx.fillStyle = this.game.board[centerStone[0]][centerStone[1]] === 1 ? '#fff' : '#000';
                    this.ctx.font = 'bold 12px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(libertyCount.toString(), cx, cy);
                }
            }
        }
    }

    drawLiberties() {
        if (!this.selectedStone) return;
        const [sx, sy] = this.selectedStone;
        if (this.game.board[sx][sy] === 0) return;

        const group = this.game.getGroup(sx, sy);

        // 高亮棋群
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 3;
        for (const [x, y] of group.stones) {
            const [cx, cy] = this.toCanvas(x, y);
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, this.cellSize * 0.5, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // 绘制气
        this.ctx.fillStyle = '#4CAF50';
        for (const [x, y] of group.liberties) {
            const [cx, cy] = this.toCanvas(x, y);
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 显示气数
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const [cx, cy] = this.toCanvas(sx, sy);
        this.ctx.fillText(group.liberties.length.toString(), cx, cy);
    }

    drawInfluence() {
        const influence = this.game.calculateInfluence();

        for (let x = 0; x < this.game.size; x++) {
            for (let y = 0; y < this.game.size; y++) {
                if (this.game.board[x][y] === 0) {
                    const val = influence[x][y];
                    if (Math.abs(val) > 0.1) {
                        const [cx, cy] = this.toCanvas(x, y);
                        const alpha = Math.min(Math.abs(val) * 0.3, 0.5);

                        if (val > 0) {
                            this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                        } else {
                            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                        }

                        this.ctx.fillRect(
                            cx - this.cellSize / 2,
                            cy - this.cellSize / 2,
                            this.cellSize,
                            this.cellSize
                        );
                    }
                }
            }
        }
    }

    // 绘制预览棋子
    drawPreview(x, y) {
        if (!this.game.canPlace(x, y)) return;

        const [cx, cy] = this.toCanvas(x, y);
        const radius = this.cellSize * 0.45;

        this.ctx.globalAlpha = 0.5;
        if (this.game.currentPlayer === 1) {
            this.ctx.fillStyle = '#000';
        } else {
            this.ctx.fillStyle = '#fff';
        }
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }
}
