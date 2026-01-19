// 中国象棋在线对弈 / AI对弈
(function() {
    const roomData = JSON.parse(sessionStorage.getItem('roomData') || '{}');
    if (!roomData.roomId) {
        window.location.href = '/';
        return;
    }

    const isAiMode = roomData.mode === 'ai';
    let ws = null;
    let useServerAi = true; // 优先使用服务端AI
    let mySeat = isAiMode ? 0 : roomData.seat;
    let gameStarted = isAiMode;
    let currentPlayer = 0;
    let board = [];
    let selectedPiece = null;
    let aiThinking = false; // AI思考中标志
    let lastActionTime = Date.now(); // 最后操作时间
    let inactivityTimer = null; // 无操作计时器
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5分钟

    const cellWidth = 50;
    const cellHeight = 50;
    const padding = 30;
    const cols = 9;
    const rows = 10;

    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    canvas.width = (cols - 1) * cellWidth + padding * 2;
    canvas.height = (rows - 1) * cellHeight + padding * 2;

    const roomIdEl = document.getElementById('room-id');
    const playerListEl = document.getElementById('player-list');
    const currentPlayerEl = document.getElementById('current-player');
    const readyBtn = document.getElementById('ready-btn');
    const leaveBtn = document.getElementById('leave-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    // 棋子名称 正数红方 负数黑方
    const pieceNames = {
        1: '車', 2: '馬', 3: '相', 4: '仕', 5: '帥', 6: '炮', 7: '兵',
        '-1': '車', '-2': '馬', '-3': '象', '-4': '士', '-5': '將', '-6': '砲', '-7': '卒'
    };

    // 棋子价值（用于AI评估）
    const pieceValues = { 1: 600, 2: 270, 3: 120, 4: 120, 5: 10000, 6: 285, 7: 30 };

    let players = isAiMode
        ? [{ name: '你', seat: 0, ready: true }, { name: 'AI', seat: 1, ready: true }]
        : (roomData.players || [{ name: localStorage.getItem('playerName') || '玩家', seat: 0, ready: false }]);

    roomIdEl.textContent = isAiMode ? 'AI对弈' : roomData.roomId;
    initBoard();
    renderPlayers();
    draw();

    if (isAiMode) {
        readyBtn.style.display = 'none';
        updateStatus();
        addChatMessage('系统', '游戏开始！你执红先行');
        startInactivityTimer();
    }

    // 无操作计时器
    function startInactivityTimer() {
        if (!isAiMode || !gameStarted) return;

        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            if (gameStarted) {
                addChatMessage('系统', '5分钟无操作，游戏自动结束');
                gameStarted = false;
                if (ws) {
                    ws.close();
                }
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        }, INACTIVITY_TIMEOUT);
    }

    function resetInactivityTimer() {
        lastActionTime = Date.now();
        startInactivityTimer();
    }

    function initBoard() {
        board = Array(rows).fill(null).map(() => Array(cols).fill(0));
        // 黑方 (上方)
        board[0] = [-1, -2, -3, -4, -5, -4, -3, -2, -1];
        board[2][1] = -6; board[2][7] = -6;
        board[3] = [-7, 0, -7, 0, -7, 0, -7, 0, -7];
        // 红方 (下方)
        board[9] = [1, 2, 3, 4, 5, 4, 3, 2, 1];
        board[7][1] = 6; board[7][7] = 6;
        board[6] = [7, 0, 7, 0, 7, 0, 7, 0, 7];
    }

    // ========== 棋子移动规则 ==========
    // 计算两点之间的棋子数量（不含起点终点）
    function countPiecesBetween(x1, y1, x2, y2) {
        let count = 0;
        if (x1 === x2) {
            const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
            for (let y = minY + 1; y < maxY; y++) {
                if (board[y][x1] !== 0) count++;
            }
        } else if (y1 === y2) {
            const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
            for (let x = minX + 1; x < maxX; x++) {
                if (board[y1][x] !== 0) count++;
            }
        }
        return count;
    }

    // 验证移动是否合法
    function isValidMove(fromX, fromY, toX, toY, piece) {
        const absPiece = Math.abs(piece);
        const isRed = piece > 0;
        const target = board[toY][toX];

        // 不能吃自己的棋子
        if (target !== 0 && (target > 0) === isRed) return false;

        const dx = toX - fromX, dy = toY - fromY;
        const adx = Math.abs(dx), ady = Math.abs(dy);

        switch (absPiece) {
            case 1: // 車：直线移动，不能越子
                if (dx !== 0 && dy !== 0) return false;
                return countPiecesBetween(fromX, fromY, toX, toY) === 0;

            case 2: // 馬：日字形，检查蹩马腿
                if (!((adx === 1 && ady === 2) || (adx === 2 && ady === 1))) return false;
                // 蹩马腿检查
                if (adx === 2) {
                    if (board[fromY][fromX + dx / 2] !== 0) return false;
                } else {
                    if (board[fromY + dy / 2][fromX] !== 0) return false;
                }
                return true;

            case 3: // 象/相：田字形，不能过河，检查塞象眼
                if (adx !== 2 || ady !== 2) return false;
                // 不能过河
                if (isRed && toY < 5) return false;
                if (!isRed && toY > 4) return false;
                // 塞象眼检查
                if (board[fromY + dy / 2][fromX + dx / 2] !== 0) return false;
                return true;

            case 4: // 士/仕：斜线一格，不出九宫
                if (adx !== 1 || ady !== 1) return false;
                // 九宫范围
                if (toX < 3 || toX > 5) return false;
                if (isRed && (toY < 7 || toY > 9)) return false;
                if (!isRed && (toY < 0 || toY > 2)) return false;
                return true;

            case 5: // 將/帥：九宫内一格，检查将帅对面
                if (!((adx === 1 && ady === 0) || (adx === 0 && ady === 1))) return false;
                // 九宫范围
                if (toX < 3 || toX > 5) return false;
                if (isRed && (toY < 7 || toY > 9)) return false;
                if (!isRed && (toY < 0 || toY > 2)) return false;
                return true;

            case 6: // 炮：直线移动，吃子需隔一子
                if (dx !== 0 && dy !== 0) return false;
                const between = countPiecesBetween(fromX, fromY, toX, toY);
                if (target === 0) return between === 0; // 移动
                return between === 1; // 吃子

            case 7: // 兵/卒：过河前只能前进，过河后可左右
                if (isRed) {
                    // 红兵向上走
                    if (fromY > 4) { // 未过河
                        return dx === 0 && dy === -1;
                    } else { // 已过河
                        return (dx === 0 && dy === -1) || (ady === 0 && adx === 1);
                    }
                } else {
                    // 黑卒向下走
                    if (fromY < 5) { // 未过河
                        return dx === 0 && dy === 1;
                    } else { // 已过河
                        return (dx === 0 && dy === 1) || (ady === 0 && adx === 1);
                    }
                }
        }
        return false;
    }

    // 检查将帅是否对面（返回true表示非法局面）
    function isKingsFacing() {
        let redKingX = -1, redKingY = -1, blackKingX = -1, blackKingY = -1;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (board[y][x] === 5) { redKingY = y; redKingX = x; }
                if (board[y][x] === -5) { blackKingY = y; blackKingX = x; }
            }
        }
        if (redKingX !== blackKingX) return false;
        return countPiecesBetween(redKingX, redKingY, blackKingX, blackKingY) === 0;
    }

    // 获取所有合法移动
    function getAllMoves(isRedTurn) {
        const moves = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const piece = board[y][x];
                if (piece === 0 || (piece > 0) !== isRedTurn) continue;
                for (let ty = 0; ty < rows; ty++) {
                    for (let tx = 0; tx < cols; tx++) {
                        if (isValidMove(x, y, tx, ty, piece)) {
                            // 模拟移动检查将帅对面
                            const captured = board[ty][tx];
                            board[ty][tx] = piece;
                            board[y][x] = 0;
                            const facing = isKingsFacing();
                            board[y][x] = piece;
                            board[ty][tx] = captured;
                            if (!facing) {
                                moves.push({ fromX: x, fromY: y, toX: tx, toY: ty, captured });
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }

    // ========== FEN转换函数 ==========
    /**
     * 将棋盘转换为FEN格式
     * FEN格式：rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1
     */
    function boardToFen() {
        const pieceMap = {
            1: 'R', 2: 'N', 3: 'B', 4: 'A', 5: 'K', 6: 'C', 7: 'P',
            '-1': 'r', '-2': 'n', '-3': 'b', '-4': 'a', '-5': 'k', '-6': 'c', '-7': 'p'
        };

        let fen = '';
        for (let y = 0; y < rows; y++) {
            let empty = 0;
            for (let x = 0; x < cols; x++) {
                const piece = board[y][x];
                if (piece === 0) {
                    empty++;
                } else {
                    if (empty > 0) {
                        fen += empty;
                        empty = 0;
                    }
                    fen += pieceMap[piece];
                }
            }
            if (empty > 0) fen += empty;
            if (y < rows - 1) fen += '/';
        }

        // 添加当前玩家 (w=红方先行, b=黑方先行)
        // currentPlayer: 0=红方, 1=黑方
        // 修复：红方走完后应该是黑方(b)，黑方走完后应该是红方(w)
        fen += currentPlayer === 0 ? ' w' : ' b';
        fen += ' - - 0 1';

        return fen;
    }

    // ========== AI逻辑 ==========
    function evaluateBoard() {
        let score = 0;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const piece = board[y][x];
                if (piece === 0) continue;
                const value = pieceValues[Math.abs(piece)];
                // 位置加成
                let posBonus = 0;
                if (Math.abs(piece) === 7) { // 兵/卒过河加分
                    if (piece > 0 && y < 5) posBonus = 20;
                    if (piece < 0 && y > 4) posBonus = 20;
                }
                if (piece > 0) score += value + posBonus;
                else score -= value + posBonus;
            }
        }
        return score;
    }

    function minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) return evaluateBoard();

        const moves = getAllMoves(isMaximizing);
        if (moves.length === 0) {
            return isMaximizing ? -100000 : 100000;
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                const captured = board[move.toY][move.toX];
                const piece = board[move.fromY][move.fromX];
                board[move.toY][move.toX] = piece;
                board[move.fromY][move.fromX] = 0;

                const eval_ = minimax(depth - 1, alpha, beta, false);

                board[move.fromY][move.fromX] = piece;
                board[move.toY][move.toX] = captured;

                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const captured = board[move.toY][move.toX];
                const piece = board[move.fromY][move.fromX];
                board[move.toY][move.toX] = piece;
                board[move.fromY][move.fromX] = 0;

                const eval_ = minimax(depth - 1, alpha, beta, true);

                board[move.fromY][move.fromX] = piece;
                board[move.toY][move.toX] = captured;

                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    function aiMove() {
        const moves = getAllMoves(false); // AI是黑方
        if (moves.length === 0) return null;

        let bestMove = null;
        let bestScore = Infinity;

        for (const move of moves) {
            const captured = board[move.toY][move.toX];
            const piece = board[move.fromY][move.fromX];
            board[move.toY][move.toX] = piece;
            board[move.fromY][move.fromX] = 0;

            const score = minimax(2, -Infinity, Infinity, true);

            board[move.fromY][move.fromX] = piece;
            board[move.toY][move.toX] = captured;

            if (score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        return bestMove;
    }

    function doAiMove() {
        if (aiThinking) return;

        // 优先使用服务端AI
        if (useServerAi && ws) {
            aiThinking = true;
            updateStatus();
            addChatMessage('系统', 'AI思考中...');

            const fen = boardToFen();
            console.log('[doAiMove] 发送FEN给AI:', fen);
            console.log('[doAiMove] 当前玩家:', currentPlayer, '(0=红方, 1=黑方)');

            ws.send(JSON.stringify({
                type: 'aiRequest',
                game: 'chess',
                fen: fen,
                depth: 10
            }));
        } else {
            // 回退到本地AI
            setTimeout(() => {
                const move = aiMove();
                if (move) {
                    executeAiMove(move);
                } else {
                    addChatMessage('系统', '游戏结束！红方获胜');
                    showGameEndEffect(true, '你赢了！');
                    gameStarted = false;
                }
            }, 500);
        }
    }

    function executeAiMove(move) {
        // 验证AI返回的坐标是否合法
        if (!move || move.fromX === undefined || move.fromY === undefined ||
            move.toX === undefined || move.toY === undefined) {
            console.error('[executeAiMove] 无效的移动数据:', move);
            aiThinking = false;
            addChatMessage('系统', 'AI返回了无效的移动');
            return;
        }

        console.log('[executeAiMove] AI移动:', move);
        const piece = board[move.fromY][move.fromX];
        console.log('[executeAiMove] 移动的棋子:', piece, '(负数=黑方, 正数=红方)');

        // 验证移动的棋子是否属于黑方（AI）
        if (piece >= 0) {
            console.error('[executeAiMove] AI尝试移动红方棋子:', piece, move);
            aiThinking = false;
            addChatMessage('系统', 'AI移动错误：尝试移动红方棋子');
            return;
        }

        const captured = board[move.toY][move.toX];

        // 执行移动
        board[move.toY][move.toX] = piece;
        board[move.fromY][move.fromX] = 0;

        // 切换回红方
        currentPlayer = 0;
        selectedPiece = null;
        aiThinking = false;

        console.log('[executeAiMove] AI移动完成，切换到红方');
        draw();
        updateStatus();

        // 检查是否吃掉了帅
        if (captured === 5) {
            addChatMessage('系统', '游戏结束！黑方获胜');
            showGameEndEffect(false, '你输了');
            gameStarted = false;
        }
    }

    function makeMove(fromX, fromY, toX, toY) {
        const piece = board[fromY][fromX];
        if (!isValidMove(fromX, fromY, toX, toY, piece)) {
            addChatMessage('系统', '非法移动');
            return false;
        }

        // 检查移动后将帅是否对面
        const captured = board[toY][toX];
        board[toY][toX] = piece;
        board[fromY][fromX] = 0;
        if (isKingsFacing()) {
            board[fromY][fromX] = piece;
            board[toY][toX] = captured;
            addChatMessage('系统', '将帅不能对面');
            return false;
        }

        currentPlayer = 1;
        selectedPiece = null;
        draw();
        updateStatus();
        resetInactivityTimer(); // 重置计时器

        // 检查是否吃掉了将
        if (captured === -5) {
            addChatMessage('系统', '游戏结束！红方获胜');
            showGameEndEffect(true, '你赢了！');
            gameStarted = false;
            clearTimeout(inactivityTimer);
            return true;
        }

        // AI回合
        doAiMove();
        return true;
    }
    // ========== AI逻辑结束 ==========

    function connect() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${location.host}`);

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'setName', name: localStorage.getItem('playerName') || '玩家' }));
            if (!isAiMode) {
                ws.send(JSON.stringify({ type: 'joinRoom', roomId: roomData.roomId }));
            }
        };

        ws.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            handleMessage(msg);
        };

        ws.onclose = () => {
            if (!isAiMode) {
                addChatMessage('系统', '连接断开，正在重连...');
                setTimeout(connect, 3000);
            } else {
                addChatMessage('系统', '与服务器断开连接，使用本地AI');
                useServerAi = false;
            }
        };

        ws.onerror = () => {
            if (isAiMode) {
                addChatMessage('系统', '服务器AI不可用，使用本地AI');
                useServerAi = false;
            }
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
                selectedPiece = null;
                readyBtn.disabled = true;
                updateStatus();
                draw();
                addChatMessage('系统', '游戏开始！红方先行');
                break;
            case 'gameUpdate':
                if (msg.action === 'move') {
                    const piece = board[msg.fromY][msg.fromX];
                    board[msg.toY][msg.toX] = piece;
                    board[msg.fromY][msg.fromX] = 0;
                    currentPlayer = msg.currentPlayer;
                    selectedPiece = null;
                    draw();
                }
                updateStatus();
                break;
            case 'gameOver':
                gameStarted = false;
                readyBtn.disabled = false;
                clearTimeout(inactivityTimer); // 清除计时器
                const chessWinnerName = msg.winner === 0 ? '红方' : '黑方';
                const chessIsWinner = msg.winner === mySeat;
                addChatMessage('系统', `游戏结束！${chessWinnerName}获胜`);
                showGameEndEffect(chessIsWinner, chessIsWinner ? '你赢了！' : '你输了');
                break;
            case 'gameEnded':
                gameStarted = false;
                readyBtn.disabled = false;
                clearTimeout(inactivityTimer); // 清除计时器
                addChatMessage('系统', `游戏结束：${msg.reason}`);
                break;
            case 'chat':
                addChatMessage(msg.name, msg.text);
                break;
            case 'leftRoom':
                clearTimeout(inactivityTimer); // 清除计时器
                window.location.href = '/';
                break;
            case 'aiResponse':
                if (msg.game === 'chess' && msg.move) {
                    aiThinking = false;
                    // 显示AI类型提示
                    if (msg.usingEngine) {
                        addChatMessage('系统', 'AI引擎已响应');
                    } else {
                        addChatMessage('系统', '使用本地AI（引擎繁忙）');
                    }
                    executeAiMove(msg.move);
                }
                break;
            case 'aiError':
                aiThinking = false;
                if (msg.useLocalAi) {
                    addChatMessage('系统', msg.message + '，切换到本地AI');
                    useServerAi = false;
                    // 使用本地AI重试
                    setTimeout(() => {
                        const move = aiMove();
                        if (move) {
                            executeAiMove(move);
                        }
                    }, 500);
                } else {
                    addChatMessage('系统', 'AI引擎错误: ' + msg.message);
                }
                break;
            case 'error':
                alert(msg.message);
                if (!isAiMode) {
                    // 收到错误后返回大厅，避免重连循环
                    ws.onclose = null;
                    ws.close();
                    clearTimeout(inactivityTimer); // 清除计时器
                    window.location.href = '/';
                }
                break;
        }
    }

    function renderPlayers() {
        const seatNames = ['红方', '黑方'];
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
            let statusText = (currentPlayer === 0 ? '红方' : '黑方');
            if (aiThinking) {
                statusText += ' (AI思考中...)';
            } else if (isMyTurn) {
                statusText += ' (你的回合)';
            }
            currentPlayerEl.textContent = statusText;
        }
    }

    function draw() {
        ctx.fillStyle = '#f0d9b5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        // 画横线
        for (let y = 0; y < rows; y++) {
            ctx.beginPath();
            ctx.moveTo(padding, padding + y * cellHeight);
            ctx.lineTo(padding + (cols - 1) * cellWidth, padding + y * cellHeight);
            ctx.stroke();
        }

        // 画竖线 (楚河汉界处断开)
        for (let x = 0; x < cols; x++) {
            if (x === 0 || x === cols - 1) {
                ctx.beginPath();
                ctx.moveTo(padding + x * cellWidth, padding);
                ctx.lineTo(padding + x * cellWidth, padding + (rows - 1) * cellHeight);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(padding + x * cellWidth, padding);
                ctx.lineTo(padding + x * cellWidth, padding + 4 * cellHeight);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(padding + x * cellWidth, padding + 5 * cellHeight);
                ctx.lineTo(padding + x * cellWidth, padding + (rows - 1) * cellHeight);
                ctx.stroke();
            }
        }

        // 九宫格斜线
        ctx.beginPath();
        ctx.moveTo(padding + 3 * cellWidth, padding);
        ctx.lineTo(padding + 5 * cellWidth, padding + 2 * cellHeight);
        ctx.moveTo(padding + 5 * cellWidth, padding);
        ctx.lineTo(padding + 3 * cellWidth, padding + 2 * cellHeight);
        ctx.moveTo(padding + 3 * cellWidth, padding + 7 * cellHeight);
        ctx.lineTo(padding + 5 * cellWidth, padding + 9 * cellHeight);
        ctx.moveTo(padding + 5 * cellWidth, padding + 7 * cellHeight);
        ctx.lineTo(padding + 3 * cellWidth, padding + 9 * cellHeight);
        ctx.stroke();

        // 楚河汉界
        ctx.font = 'bold 20px serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('楚 河', padding + 1.5 * cellWidth, padding + 4.5 * cellHeight);
        ctx.fillText('漢 界', padding + 6.5 * cellWidth, padding + 4.5 * cellHeight);

        // 画棋子
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (board[y][x] !== 0) {
                    drawPiece(x, y, board[y][x]);
                }
            }
        }

        // 高亮选中的棋子
        if (selectedPiece) {
            const [sx, sy] = selectedPiece;
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(padding + sx * cellWidth, padding + sy * cellHeight, 22, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function drawPiece(x, y, piece) {
        const cx = padding + x * cellWidth;
        const cy = padding + y * cellHeight;
        const r = 20;

        // 棋子底色
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffeaa7';
        ctx.fill();
        ctx.strokeStyle = piece > 0 ? '#c0392b' : '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 棋子文字
        ctx.font = 'bold 18px serif';
        ctx.fillStyle = piece > 0 ? '#c0392b' : '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pieceNames[piece], cx, cy);
    }

    function toBoard(canvasX, canvasY) {
        const x = Math.round((canvasX - padding) / cellWidth);
        const y = Math.round((canvasY - padding) / cellHeight);
        if (x >= 0 && x < cols && y >= 0 && y < rows) return [x, y];
        return null;
    }

    canvas.addEventListener('click', (e) => {
        // AI思考时禁止玩家操作
        if (!gameStarted || mySeat !== currentPlayer || aiThinking) return;

        const rect = canvas.getBoundingClientRect();
        const pos = toBoard(e.clientX - rect.left, e.clientY - rect.top);
        if (!pos) return;

        const [x, y] = pos;
        const piece = board[y][x];

        // 判断是否是自己的棋子
        const isMyPiece = (mySeat === 0 && piece > 0) || (mySeat === 1 && piece < 0);

        if (selectedPiece) {
            const [sx, sy] = selectedPiece;
            if (x === sx && y === sy) {
                // 取消选择
                selectedPiece = null;
                draw();
            } else if (isMyPiece) {
                // 选择另一个己方棋子
                selectedPiece = [x, y];
                draw();
            } else {
                // 尝试移动
                if (isAiMode) {
                    makeMove(sx, sy, x, y);
                } else {
                    ws.send(JSON.stringify({
                        type: 'gameAction',
                        action: 'move',
                        fromX: sx, fromY: sy,
                        toX: x, toY: y
                    }));
                }
            }
        } else if (isMyPiece) {
            selectedPiece = [x, y];
            draw();
        }
    });

    readyBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'ready' }));
    });

    leaveBtn.addEventListener('click', () => {
        clearTimeout(inactivityTimer); // 清除计时器
        if (isAiMode) {
            if (ws) {
                ws.close();
            }
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
            ws.send(JSON.stringify({ type: 'chat', text }));
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
