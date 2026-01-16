// 中国象棋在线对弈
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
    let selectedPiece = null;

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

    let players = roomData.players || [{ name: localStorage.getItem('playerName') || '玩家', seat: 0, ready: false }];

    roomIdEl.textContent = roomData.roomId;
    initBoard();
    renderPlayers();
    draw();

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
                addChatMessage('系统', `游戏结束！${msg.winner === 0 ? '红方' : '黑方'}获胜`);
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
            currentPlayerEl.textContent = (currentPlayer === 0 ? '红方' : '黑方') + (isMyTurn ? ' (你的回合)' : '');
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
        if (!gameStarted || mySeat !== currentPlayer) return;

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
                ws.send(JSON.stringify({
                    type: 'gameAction',
                    action: 'move',
                    fromX: sx, fromY: sy,
                    toX: x, toY: y
                }));
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
