// 五子棋在线对弈 / AI对弈
(function() {
    const roomData = JSON.parse(sessionStorage.getItem('roomData') || '{}');
    if (!roomData.roomId) {
        window.location.href = '/';
        return;
    }

    const isAiMode = roomData.mode === 'ai';
    let ws = null;
    let mySeat = isAiMode ? 0 : roomData.seat;
    let gameStarted = isAiMode;
    let currentPlayer = 0;
    let board = [];
    const size = 15;
    const cellSize = 32;
    const padding = 20;

    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    canvas.width = (size - 1) * cellSize + padding * 2;
    canvas.height = (size - 1) * cellSize + padding * 2;

    const roomIdEl = document.getElementById('room-id');
    const playerListEl = document.getElementById('player-list');
    const currentPlayerEl = document.getElementById('current-player');
    const readyBtn = document.getElementById('ready-btn');
    const leaveBtn = document.getElementById('leave-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    let players = isAiMode
        ? [{ name: '你', seat: 0, ready: true }, { name: 'AI', seat: 1, ready: true }]
        : (roomData.players || [{ name: localStorage.getItem('playerName') || '玩家', seat: 0, ready: false }]);
    let lastMove = null;

    roomIdEl.textContent = isAiMode ? 'AI对弈' : roomData.roomId;
    initBoard();
    renderPlayers();
    draw();

    if (isAiMode) {
        readyBtn.style.display = 'none';
        updateStatus();
        addChatMessage('系统', '游戏开始！你执黑先行');
    }

    function initBoard() {
        board = Array(size).fill(null).map(() => Array(size).fill(0));
    }

    // ========== AI逻辑 ==========
    // 棋型分数定义
    const SCORE = {
        FIVE: 100000,      // 连五
        LIVE_FOUR: 10000,  // 活四
        RUSH_FOUR: 1000,   // 冲四
        LIVE_THREE: 1000,  // 活三
        SLEEP_THREE: 100,  // 眠三
        LIVE_TWO: 100,     // 活二
        SLEEP_TWO: 10,     // 眠二
        LIVE_ONE: 10,      // 活一
        SLEEP_ONE: 1       // 眠一
    };

    function checkWin(x, y) {
        const color = board[x][y];
        const directions = [[1,0],[0,1],[1,1],[1,-1]];
        for (const [dx, dy] of directions) {
            let count = 1;
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i, ny = y + dy * i;
                if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[nx][ny] === color) count++;
                else break;
            }
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i, ny = y - dy * i;
                if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[nx][ny] === color) count++;
                else break;
            }
            if (count >= 5) return true;
        }
        return false;
    }

    // 分析一条线上的棋型
    function analyzeLine(x, y, dx, dy, player) {
        const line = [];
        // 向两个方向延伸，收集9个位置的信息
        for (let i = -4; i <= 4; i++) {
            const nx = x + dx * i, ny = y + dy * i;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                line.push(board[nx][ny]);
            } else {
                line.push(-1); // 边界
            }
        }

        // 分析棋型
        let count = 0, block = 0, space = 0;
        let leftRange = 0, rightRange = 0;

        // 中心点是当前位置
        const center = 4;

        // 向左统计
        for (let i = center - 1; i >= 0; i--) {
            if (line[i] === player) {
                count++;
                leftRange++;
            } else if (line[i] === 0) {
                if (space === 0) {
                    space++;
                    leftRange++;
                } else {
                    break;
                }
            } else {
                block++;
                break;
            }
        }

        // 向右统计
        for (let i = center + 1; i < line.length; i++) {
            if (line[i] === player) {
                count++;
                rightRange++;
            } else if (line[i] === 0) {
                if (space === 0) {
                    space++;
                    rightRange++;
                } else {
                    break;
                }
            } else {
                block++;
                break;
            }
        }

        // 判断棋型
        if (count >= 4) return SCORE.FIVE;

        if (count === 3) {
            if (block === 0 && space === 0) return SCORE.LIVE_FOUR; // _XXX_
            if (block === 1 && space === 0) return SCORE.RUSH_FOUR; // XXXX| 或 |XXXX
            if (block === 0 && space === 1) return SCORE.LIVE_THREE; // _XX_X_ 或 _X_XX_
            if (block === 1 && space === 1) return SCORE.SLEEP_THREE;
        }

        if (count === 2) {
            if (block === 0 && space === 0) return SCORE.LIVE_THREE; // _XX_
            if (block === 1 && space === 0) return SCORE.SLEEP_THREE;
            if (block === 0 && space === 1) return SCORE.LIVE_TWO;
            if (block === 1 && space === 1) return SCORE.SLEEP_TWO;
        }

        if (count === 1) {
            if (block === 0 && space === 0) return SCORE.LIVE_TWO; // _X_
            if (block === 1 && space === 0) return SCORE.SLEEP_TWO;
            if (block === 0) return SCORE.LIVE_ONE;
            return SCORE.SLEEP_ONE;
        }

        return 0;
    }

    // 评估某个位置的分数
    function evaluatePosition(x, y, player) {
        let score = 0;
        const directions = [[1,0],[0,1],[1,1],[1,-1]];

        for (const [dx, dy] of directions) {
            score += analyzeLine(x, y, dx, dy, player);
        }

        return score;
    }

    // 评估整个棋盘
    function evaluateBoard() {
        let score = 0;
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                if (board[x][y] === 1) {
                    score -= evaluatePosition(x, y, 1);
                } else if (board[x][y] === 2) {
                    score += evaluatePosition(x, y, 2);
                }
            }
        }
        return score;
    }

    // 生成候选着法（只考虑有意义的位置）
    function generateMoves() {
        const moves = [];
        const checked = new Set();

        // 如果是第一步，下在中心
        let hasStone = false;
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                if (board[x][y] !== 0) {
                    hasStone = true;
                    break;
                }
            }
            if (hasStone) break;
        }

        if (!hasStone) {
            return [[Math.floor(size/2), Math.floor(size/2)]];
        }

        // 收集所有已有棋子周围2格内的空位
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                if (board[x][y] !== 0) {
                    for (let dx = -2; dx <= 2; dx++) {
                        for (let dy = -2; dy <= 2; dy++) {
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[nx][ny] === 0) {
                                const key = `${nx},${ny}`;
                                if (!checked.has(key)) {
                                    checked.add(key);
                                    moves.push([nx, ny]);
                                }
                            }
                        }
                    }
                }
            }
        }

        return moves;
    }

    // Minimax搜索（带Alpha-Beta剪枝）
    function minimax(depth, alpha, beta, isMaximizing) {
        // 检查游戏是否结束
        const score = evaluateBoard();
        if (Math.abs(score) > 50000) return score;
        if (depth === 0) return score;

        const moves = generateMoves();
        if (moves.length === 0) return 0;

        // 对候选着法进行排序（启发式搜索）
        const scoredMoves = moves.map(([x, y]) => {
            board[x][y] = isMaximizing ? 2 : 1;
            const s = evaluatePosition(x, y, isMaximizing ? 2 : 1);
            board[x][y] = 0;
            return [x, y, s];
        });
        scoredMoves.sort((a, b) => b[2] - a[2]);

        // 只考虑前15个最好的着法
        const topMoves = scoredMoves.slice(0, 15);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const [x, y] of topMoves) {
                board[x][y] = 2;
                const eval_ = minimax(depth - 1, alpha, beta, false);
                board[x][y] = 0;
                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break; // Beta剪枝
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const [x, y] of topMoves) {
                board[x][y] = 1;
                const eval_ = minimax(depth - 1, alpha, beta, true);
                board[x][y] = 0;
                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break; // Alpha剪枝
            }
            return minEval;
        }
    }

    // AI选择最佳着法
    function aiMove() {
        const moves = generateMoves();
        if (moves.length === 0) return [Math.floor(size/2), Math.floor(size/2)];

        // 首先检查是否有必胜或必防的着法
        for (const [x, y] of moves) {
            // 检查AI是否能直接获胜
            board[x][y] = 2;
            if (checkWin(x, y)) {
                board[x][y] = 0;
                return [x, y];
            }
            board[x][y] = 0;

            // 检查是否需要防守对手的获胜着法
            board[x][y] = 1;
            if (checkWin(x, y)) {
                board[x][y] = 0;
                return [x, y];
            }
            board[x][y] = 0;
        }

        // 使用Minimax搜索找最佳着法
        let bestMove = null;
        let bestScore = -Infinity;
        const depth = 4; // 搜索深度

        // 评估每个候选着法
        const scoredMoves = moves.map(([x, y]) => {
            board[x][y] = 2;
            const attackScore = evaluatePosition(x, y, 2);
            board[x][y] = 1;
            const defenseScore = evaluatePosition(x, y, 1);
            board[x][y] = 0;
            return [x, y, attackScore + defenseScore];
        });
        scoredMoves.sort((a, b) => b[2] - a[2]);

        // 只对前10个最有希望的着法进行深度搜索
        const topMoves = scoredMoves.slice(0, 10);

        for (const [x, y] of topMoves) {
            board[x][y] = 2;
            const score = minimax(depth - 1, -Infinity, Infinity, false);
            board[x][y] = 0;

            if (score > bestScore) {
                bestScore = score;
                bestMove = [x, y];
            }
        }

        return bestMove || moves[0];
    }

    function doAiMove() {
        setTimeout(() => {
            const [x, y] = aiMove();
            board[x][y] = 2;
            lastMove = [x, y];
            draw();
            if (checkWin(x, y)) {
                addChatMessage('系统', '游戏结束！AI获胜');
                gameStarted = false;
            } else {
                currentPlayer = 0;
                updateStatus();
            }
        }, 300);
    }
    // ========== AI逻辑结束 ==========

    function connect() {
        if (isAiMode) return;
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${location.host}`);

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'setName', name: localStorage.getItem('playerName') || '玩家' }));
            ws.send(JSON.stringify({ type: 'joinRoom', roomId: roomData.roomId }));
        };

        ws.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            handleMessage(msg);
        };

        ws.onclose = () => {
            addChatMessage('系统', '连接断开，正在重连...');
            setTimeout(connect, 3000);
        };
    }

    function handleMessage(msg) {
        switch (msg.type) {
            case 'roomJoined':
                mySeat = msg.seat;
                players = msg.players;
                renderPlayers();
                break;
            case 'playerJoined':
                players.push({ name: msg.name, seat: msg.seat, ready: false });
                renderPlayers();
                addChatMessage('系统', `${msg.name} 加入了房间`);
                break;
            case 'playerLeft':
                const leftPlayer = players.find(p => p.seat === msg.seat);
                if (leftPlayer) addChatMessage('系统', `${leftPlayer.name} 离开了房间`);
                players = players.filter(p => p.seat !== msg.seat);
                renderPlayers();
                break;
            case 'playerReady':
                const p = players.find(p => p.seat === msg.seat);
                if (p) p.ready = msg.ready;
                renderPlayers();
                break;
            case 'gameStarted':
                gameStarted = true;
                currentPlayer = msg.currentPlayer;
                initBoard();
                readyBtn.disabled = true;
                updateStatus();
                draw();
                addChatMessage('系统', '游戏开始！黑方先行');
                break;
            case 'gameUpdate':
                if (msg.action === 'place') {
                    board[msg.x][msg.y] = msg.player + 1;
                    lastMove = [msg.x, msg.y];
                    currentPlayer = msg.currentPlayer;
                    draw();
                }
                updateStatus();
                break;
            case 'gameOver':
                gameStarted = false;
                readyBtn.disabled = false;
                const gomokuWinnerName = msg.winner === 0 ? '黑方' : '白方';
                const gomokuIsWinner = msg.winner === mySeat;
                addChatMessage('系统', `游戏结束！${gomokuWinnerName}获胜`);
                showGameEndEffect(gomokuIsWinner, gomokuIsWinner ? '你赢了！' : '你输了');
                break;
            case 'gameEnded':
                gameStarted = false;
                readyBtn.disabled = false;
                addChatMessage('系统', `游戏结束：${msg.reason}`);
                break;
            case 'chat':
                addChatMessage(msg.name, msg.text);
                break;
            case 'leftRoom':
                window.location.href = '/';
                break;
            case 'error':
                alert(msg.message);
                // 收到错误后返回大厅，避免重连循环
                ws.onclose = null;
                ws.close();
                window.location.href = '/';
                break;
        }
    }

    function renderPlayers() {
        const seatNames = ['黑方', '白方'];
        playerListEl.innerHTML = [0, 1].map(seat => {
            const p = players.find(pl => pl.seat === seat);
            if (p) {
                return `<div class="player-item ${p.ready ? 'ready' : ''} ${gameStarted && currentPlayer === seat ? 'current' : ''}">
                    <span>${seatNames[seat]}: ${p.name}${seat === mySeat ? ' (你)' : ''}</span>
                    <span class="status-text ${p.ready ? 'ready' : ''}">${p.ready ? '已准备' : '未准备'}</span>
                </div>`;
            } else {
                return `<div class="player-item"><span>${seatNames[seat]}: 等待加入...</span></div>`;
            }
        }).join('');
    }

    function updateStatus() {
        if (!gameStarted) {
            currentPlayerEl.textContent = '等待开始';
        } else {
            const isMyTurn = mySeat === currentPlayer;
            currentPlayerEl.textContent = (currentPlayer === 0 ? '黑方' : '白方') + (isMyTurn ? ' (你的回合)' : '');
        }
    }

    function draw() {
        ctx.fillStyle = '#dcb35c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        for (let i = 0; i < size; i++) {
            ctx.beginPath();
            ctx.moveTo(padding + i * cellSize, padding);
            ctx.lineTo(padding + i * cellSize, padding + (size - 1) * cellSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(padding, padding + i * cellSize);
            ctx.lineTo(padding + (size - 1) * cellSize, padding + i * cellSize);
            ctx.stroke();
        }
        const stars = [[3,3],[3,11],[7,7],[11,3],[11,11]];
        ctx.fillStyle = '#000';
        for (const [x, y] of stars) {
            ctx.beginPath();
            ctx.arc(padding + x * cellSize, padding + y * cellSize, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                if (board[x][y] !== 0) drawStone(x, y, board[x][y]);
            }
        }
        if (lastMove) highlightLast(lastMove[0], lastMove[1]);
    }

    function drawStone(x, y, color) {
        const cx = padding + x * cellSize;
        const cy = padding + y * cellSize;
        const r = cellSize * 0.43;
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 2, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();
        const gradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        if (color === 1) {
            gradient.addColorStop(0, '#555');
            gradient.addColorStop(1, '#000');
        } else {
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ccc');
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    function highlightLast(x, y) {
        const cx = padding + x * cellSize;
        const cy = padding + y * cellSize;
        ctx.strokeStyle = '#f44336';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.3, 0, Math.PI * 2);
        ctx.stroke();
    }

    function toBoard(canvasX, canvasY) {
        const x = Math.round((canvasX - padding) / cellSize);
        const y = Math.round((canvasY - padding) / cellSize);
        if (x >= 0 && x < size && y >= 0 && y < size) return [x, y];
        return null;
    }

    canvas.addEventListener('click', (e) => {
        if (!gameStarted || mySeat !== currentPlayer) return;
        const rect = canvas.getBoundingClientRect();
        const pos = toBoard(e.clientX - rect.left, e.clientY - rect.top);
        if (!pos || board[pos[0]][pos[1]] !== 0) return;

        if (isAiMode) {
            board[pos[0]][pos[1]] = 1;
            lastMove = pos;
            draw();
            if (checkWin(pos[0], pos[1])) {
                addChatMessage('系统', '游戏结束！你获胜了！');
                gameStarted = false;
            } else {
                currentPlayer = 1;
                updateStatus();
                doAiMove();
            }
        } else {
            ws.send(JSON.stringify({ type: 'gameAction', action: 'place', x: pos[0], y: pos[1] }));
        }
    });

    readyBtn.addEventListener('click', () => {
        if (!isAiMode) ws.send(JSON.stringify({ type: 'ready' }));
    });

    leaveBtn.addEventListener('click', () => {
        if (isAiMode) {
            window.location.href = '/';
        } else {
            ws.send(JSON.stringify({ type: 'leaveRoom' }));
        }
    });

    function addChatMessage(name, text) {
        const div = document.createElement('div');
        div.className = 'chat-message';
        div.innerHTML = `<span class="name">${name}:</span> ${text}`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatSend.addEventListener('click', () => {
        const text = chatInput.value.trim();
        if (text) {
            if (isAiMode) {
                addChatMessage('你', text);
            } else {
                ws.send(JSON.stringify({ type: 'chat', text }));
            }
            chatInput.value = '';
        }
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') chatSend.click();
    });

    // 游戏结束动画效果
    function showGameEndEffect(isWinner, message) {
        const overlay = document.createElement('div');
        overlay.className = 'game-end-overlay';
        overlay.innerHTML = `<div class="game-end-message ${isWinner ? 'win' : 'lose'}">${message}</div>`;
        document.body.appendChild(overlay);

        if (isWinner) {
            const colors = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f', '#ff6b6b', '#4ecdc4'];
            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.style.left = Math.random() * 100 + 'vw';
                    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
                    document.body.appendChild(confetti);
                    setTimeout(() => confetti.remove(), 4000);
                }, i * 50);
            }
        } else {
            for (let i = 0; i < 20; i++) {
                setTimeout(() => {
                    const boo = document.createElement('div');
                    boo.className = 'boo-particle';
                    boo.textContent = '👎';
                    boo.style.left = Math.random() * 100 + 'vw';
                    boo.style.animationDuration = (2 + Math.random() * 1) + 's';
                    document.body.appendChild(boo);
                    setTimeout(() => boo.remove(), 3000);
                }, i * 100);
            }
        }

        setTimeout(() => overlay.remove(), 3000);
    }

    connect();
})();
