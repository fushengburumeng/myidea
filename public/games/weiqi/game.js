// 围棋在线对弈
(function() {
    const roomData = JSON.parse(sessionStorage.getItem('roomData') || '{}');
    if (!roomData.roomId) {
        window.location.href = '/';
        return;
    }

    let ws = null;
    let mySeat = roomData.seat;
    let gameStarted = false;
    let currentPlayer = 0;
    let board = [];
    let captures = [0, 0];
    const size = 19;
    const cellSize = 28;
    const padding = 20;

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
    const leaveBtn = document.getElementById('leave-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    let players = roomData.players || [{ name: localStorage.getItem('playerName') || '玩家', seat: 0, ready: false }];

    roomIdEl.textContent = roomData.roomId;
    initBoard();
    renderPlayers();
    draw();

    function initBoard() {
        board = Array(size).fill(null).map(() => Array(size).fill(0));
    }

    function connect() {
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
                    // 简单处理提子（服务端应该发送完整状态，这里简化）
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
                addChatMessage('系统', `游戏结束！${msg.winner === 0 ? '黑方' : '白方'}获胜`);
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

        // 画网格
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

        // 星位
        const stars = [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]];
        ctx.fillStyle = '#000';
        for (const [x, y] of stars) {
            ctx.beginPath();
            ctx.arc(padding + x * cellSize, padding + y * cellSize, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 棋子
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                if (board[x][y] !== 0) {
                    drawStone(x, y, board[x][y]);
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
        if (pos && board[pos[0]][pos[1]] === 0) {
            ws.send(JSON.stringify({ type: 'gameAction', action: 'place', x: pos[0], y: pos[1] }));
        }
    });

    readyBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'ready' }));
    });

    passBtn.addEventListener('click', () => {
        if (gameStarted && mySeat === currentPlayer) {
            ws.send(JSON.stringify({ type: 'gameAction', action: 'pass' }));
        }
    });

    leaveBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'leaveRoom' }));
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

    connect();
})();
