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

    function evaluateLine(x, y, dx, dy, player) {
        let count = 0, block = 0, empty = 0;
        for (let i = 1; i <= 4; i++) {
            const nx = x + dx * i, ny = y + dy * i;
            if (nx < 0 || nx >= size || ny < 0 || ny >= size) { block++; break; }
            if (board[nx][ny] === player) count++;
            else if (board[nx][ny] === 0) { empty++; break; }
            else { block++; break; }
        }
        for (let i = 1; i <= 4; i++) {
            const nx = x - dx * i, ny = y - dy * i;
            if (nx < 0 || nx >= size || ny < 0 || ny >= size) { block++; break; }
            if (board[nx][ny] === player) count++;
            else if (board[nx][ny] === 0) { empty++; break; }
            else { block++; break; }
        }
        if (count >= 4) return 10000;
        if (count === 3 && block === 0) return 1000;
        if (count === 3 && block === 1) return 100;
        if (count === 2 && block === 0) return 50;
        if (count === 2 && block === 1) return 10;
        if (count === 1 && block === 0) return 5;
        return 1;
    }

    function evaluateMove(x, y) {
        let score = 0;
        const directions = [[1,0],[0,1],[1,1],[1,-1]];
        // AI进攻
        board[x][y] = 2;
        for (const [dx, dy] of directions) score += evaluateLine(x, y, dx, dy, 2) * 1.1;
        board[x][y] = 0;
        // 防守
        board[x][y] = 1;
        for (const [dx, dy] of directions) score += evaluateLine(x, y, dx, dy, 1);
        board[x][y] = 0;
        // 中心偏好
        const center = size / 2;
        score += Math.max(0, 5 - Math.abs(x - center) - Math.abs(y - center));
        return score;
    }

    function aiMove() {
        const moves = [];
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                if (board[x][y] === 0) {
                    // 只考虑周围有棋子的位置
                    let hasNeighbor = false;
                    for (let dx = -2; dx <= 2 && !hasNeighbor; dx++) {
                        for (let dy = -2; dy <= 2 && !hasNeighbor; dy++) {
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[nx][ny] !== 0) hasNeighbor = true;
                        }
                    }
                    if (hasNeighbor || moves.length === 0) {
                        moves.push([x, y, evaluateMove(x, y)]);
                    }
                }
            }
        }
        if (moves.length === 0) return [Math.floor(size/2), Math.floor(size/2)];
        moves.sort((a, b) => b[2] - a[2]);
        return [moves[0][0], moves[0][1]];
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
                addChatMessage('系统', `游戏结束！${msg.winner === 0 ? '黑方' : '白方'}获胜`);
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

    connect();
})();
