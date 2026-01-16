// 围棋在线对弈 / AI对弈
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
    let captures = [0, 0];
    const size = 19;
    const cellSize = 28;
    const padding = 20;

    // 设置
    let aiDifficulty = 'medium';
    let showQi = false;
    let showShi = false;

    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    canvas.width = (size - 1) * cellSize + padding * 2;
    canvas.height = (size - 1) * cellSize + padding * 2;

    const roomIdEl = document.getElementById('room-id');
    const playerListEl = document.getElementById('player-list');
    const currentPlayerEl = document.getElementById('current-player');
    const blackCapturesEl = document.getElementById('black-captures');
    const whiteCapturesEl = document.getElementById('white-captures');
    const readyBtn = document.getElementById('ready-btn');
    const passBtn = document.getElementById('pass-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const leaveBtn = document.getElementById('leave-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const aiDifficultyEl = document.getElementById('ai-difficulty');
    const showQiEl = document.getElementById('show-qi');
    const showShiEl = document.getElementById('show-shi');

    let players = isAiMode
        ? [{ name: '你', seat: 0, ready: true }, { name: 'AI', seat: 1, ready: true }]
        : (roomData.players || [{ name: localStorage.getItem('playerName') || '玩家', seat: 0, ready: false }]);

    roomIdEl.textContent = isAiMode ? 'AI对弈' : roomData.roomId;
    initBoard();
    renderPlayers();
    draw();

    if (isAiMode) {
        readyBtn.style.display = 'none';
        passBtn.disabled = false;
        updateStatus();
        addChatMessage('系统', '游戏开始！你执黑先行');
    } else {
        // 双人对战模式隐藏AI难度设置
        const aiDifficultyItem = aiDifficultyEl.closest('.setting-item');
        if (aiDifficultyItem) aiDifficultyItem.style.display = 'none';
    }

    // 设置面板
    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
    });
    aiDifficultyEl.addEventListener('change', (e) => {
        aiDifficulty = e.target.value;
    });
    showQiEl.addEventListener('change', (e) => {
        showQi = e.target.checked;
        draw();
    });
    showShiEl.addEventListener('change', (e) => {
        showShi = e.target.checked;
        draw();
    });

    function initBoard() {
        board = Array(size).fill(null).map(() => Array(size).fill(0));
    }

    // ========== AI逻辑 ==========
    function getNeighbors(x, y) {
        const neighbors = [];
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) neighbors.push([nx, ny]);
        }
        return neighbors;
    }

    function getGroup(x, y) {
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
                for (const [nx, ny] of getNeighbors(cx, cy)) {
                    if (board[nx][ny] === 0) liberties.add(`${nx},${ny}`);
                    else if (board[nx][ny] === color && !visited.has(`${nx},${ny}`)) stack.push([nx, ny]);
                }
            }
        }
        return { stones, liberties: Array.from(liberties).map(s => s.split(',').map(Number)) };
    }

    function canPlace(x, y, player) {
        if (board[x][y] !== 0) return false;
        board[x][y] = player;
        const opponent = player === 1 ? 2 : 1;
        let canCapture = false;
        for (const [nx, ny] of getNeighbors(x, y)) {
            if (board[nx][ny] === opponent && getGroup(nx, ny).liberties.length === 0) {
                canCapture = true;
                break;
            }
        }
        if (canCapture) { board[x][y] = 0; return true; }
        const selfGroup = getGroup(x, y);
        board[x][y] = 0;
        return selfGroup.liberties.length > 0;
    }

    function placeStone(x, y, player) {
        board[x][y] = player;
        const opponent = player === 1 ? 2 : 1;
        let captured = 0;
        for (const [nx, ny] of getNeighbors(x, y)) {
            if (board[nx][ny] === opponent) {
                const group = getGroup(nx, ny);
                if (group.liberties.length === 0) {
                    captured += group.stones.length;
                    for (const [sx, sy] of group.stones) board[sx][sy] = 0;
                }
            }
        }
        if (player === 1) captures[0] += captured;
        else captures[1] += captured;
    }

    function aiMove() {
        const moves = [];
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                if (canPlace(x, y, 2)) moves.push([x, y, evaluateMove(x, y)]);
            }
        }
        if (moves.length === 0) return null;
        moves.sort((a, b) => b[2] - a[2]);

        // 根据难度选择
        let topN;
        if (aiDifficulty === 'easy') topN = Math.min(10, moves.length);
        else if (aiDifficulty === 'hard') topN = 1;
        else topN = Math.min(3, moves.length);

        const top = moves.slice(0, topN);
        const choice = top[Math.floor(Math.random() * top.length)];
        return [choice[0], choice[1]];
    }

    function evaluateMove(x, y) {
        let score = 0;
        // 吃子
        board[x][y] = 2;
        for (const [nx, ny] of getNeighbors(x, y)) {
            if (board[nx][ny] === 1 && getGroup(nx, ny).liberties.length === 0) score += 50;
        }
        board[x][y] = 0;
        // 防守
        for (const [nx, ny] of getNeighbors(x, y)) {
            if (board[nx][ny] === 2) {
                const g = getGroup(nx, ny);
                if (g.liberties.length <= 2) score += 30;
            }
        }
        // 中心偏好
        const center = size / 2;
        score += Math.max(0, 10 - Math.abs(x - center) - Math.abs(y - center));
        return score;
    }

    function doAiMove() {
        setTimeout(() => {
            const move = aiMove();
            if (move) {
                placeStone(move[0], move[1], 2);
                currentPlayer = 0;
            } else {
                addChatMessage('AI', '停一手');
                currentPlayer = 0;
            }
            updateStatus();
            draw();
        }, 500);
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
                captures = [0, 0];
                readyBtn.disabled = true;
                passBtn.disabled = (mySeat !== currentPlayer);
                updateStatus();
                draw();
                addChatMessage('系统', '游戏开始！黑方先行');
                break;
            case 'gameUpdate':
                if (msg.action === 'place') {
                    board[msg.x][msg.y] = msg.player + 1;
                    currentPlayer = msg.currentPlayer;
                    draw();
                } else if (msg.action === 'pass') {
                    currentPlayer = msg.currentPlayer;
                    addChatMessage('系统', `${msg.player === 0 ? '黑方' : '白方'} 停一手`);
                }
                passBtn.disabled = (mySeat !== currentPlayer);
                updateStatus();
                break;
            case 'gameOver':
                gameStarted = false;
                readyBtn.disabled = false;
                passBtn.disabled = true;
                const weiqiWinnerName = msg.winner === 0 ? '黑方' : '白方';
                const weiqiIsWinner = msg.winner === mySeat;
                addChatMessage('系统', `游戏结束！${weiqiWinnerName}获胜`);
                showGameEndEffect(weiqiIsWinner, weiqiIsWinner ? '你赢了！' : '你输了');
                break;
            case 'gameEnded':
                gameStarted = false;
                readyBtn.disabled = false;
                passBtn.disabled = true;
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
        blackCapturesEl.textContent = captures[0];
        whiteCapturesEl.textContent = captures[1];
    }

    function draw() {
        ctx.fillStyle = '#dcb35c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 显示势力范围
        if (showShi) {
            drawInfluence();
        }

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
        const stars = [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]];
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

        // 显示气
        if (showQi) {
            drawLiberties();
        }
    }

    // 绘制势力范围
    function drawInfluence() {
        const influence = Array(size).fill(null).map(() => Array(size).fill(0));
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                if (board[x][y] !== 0) {
                    const color = board[x][y] === 1 ? 1 : -1;
                    for (let dx = -4; dx <= 4; dx++) {
                        for (let dy = -4; dy <= 4; dy++) {
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                                const dist = Math.abs(dx) + Math.abs(dy);
                                if (dist <= 4) influence[nx][ny] += color * (5 - dist);
                            }
                        }
                    }
                }
            }
        }
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                if (board[x][y] === 0 && influence[x][y] !== 0) {
                    const cx = padding + x * cellSize;
                    const cy = padding + y * cellSize;
                    const val = Math.min(Math.abs(influence[x][y]) / 15, 1);
                    if (influence[x][y] > 0) {
                        ctx.fillStyle = `rgba(0,0,0,${val * 0.3})`;
                    } else {
                        ctx.fillStyle = `rgba(255,255,255,${val * 0.5})`;
                    }
                    ctx.fillRect(cx - cellSize/2, cy - cellSize/2, cellSize, cellSize);
                }
            }
        }
    }

    // 绘制所有棋群的气
    function drawLiberties() {
        const visited = new Set();
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                if (board[x][y] !== 0 && !visited.has(`${x},${y}`)) {
                    const group = getGroup(x, y);
                    group.stones.forEach(([sx, sy]) => visited.add(`${sx},${sy}`));
                    const color = board[x][y] === 1 ? 'rgba(0,100,0,0.7)' : 'rgba(100,0,100,0.7)';
                    group.liberties.forEach(([lx, ly]) => {
                        const cx = padding + lx * cellSize;
                        const cy = padding + ly * cellSize;
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            }
        }
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
            if (!canPlace(pos[0], pos[1], 1)) return;
            placeStone(pos[0], pos[1], 1);
            currentPlayer = 1;
            updateStatus();
            draw();
            doAiMove();
        } else {
            ws.send(JSON.stringify({ type: 'gameAction', action: 'place', x: pos[0], y: pos[1] }));
        }
    });

    readyBtn.addEventListener('click', () => {
        if (!isAiMode) ws.send(JSON.stringify({ type: 'ready' }));
    });

    passBtn.addEventListener('click', () => {
        if (gameStarted && mySeat === currentPlayer) {
            if (isAiMode) {
                addChatMessage('你', '停一手');
                currentPlayer = 1;
                updateStatus();
                doAiMove();
            } else {
                ws.send(JSON.stringify({ type: 'gameAction', action: 'pass' }));
            }
        }
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
        // 显示消息
        const overlay = document.createElement('div');
        overlay.className = 'game-end-overlay';
        overlay.innerHTML = `<div class="game-end-message ${isWinner ? 'win' : 'lose'}">${message}</div>`;
        document.body.appendChild(overlay);

        if (isWinner) {
            // 撒花效果
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
            // 嘘声效果
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

        // 3秒后移除消息
        setTimeout(() => overlay.remove(), 3000);
    }

    connect();
})();
