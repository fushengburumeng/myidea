// 游戏大厅
(function() {
    let ws = null;
    let currentGame = null;
    let playerName = localStorage.getItem('playerName') || '';

    const playerNameInput = document.getElementById('player-name');
    const roomModal = document.getElementById('room-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeModalBtn = document.getElementById('close-modal');
    const createRoomBtn = document.getElementById('create-room');
    const playAiBtn = document.getElementById('play-ai');
    const refreshRoomsBtn = document.getElementById('refresh-rooms');
    const roomList = document.getElementById('room-list');
    const roomIdInput = document.getElementById('room-id-input');
    const joinByIdBtn = document.getElementById('join-by-id');
    const gameCards = document.querySelectorAll('.game-card');

    // 初始化
    playerNameInput.value = playerName;
    playerNameInput.addEventListener('change', () => {
        playerName = playerNameInput.value || '玩家';
        localStorage.setItem('playerName', playerName);
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'setName', name: playerName }));
        }
    });

    // 连接WebSocket
    function connect() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${location.host}`);

        ws.onopen = () => {
            console.log('已连接到服务器');
            if (playerName) {
                ws.send(JSON.stringify({ type: 'setName', name: playerName }));
            }
        };

        ws.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            handleMessage(msg);
        };

        ws.onclose = () => {
            console.log('连接断开，3秒后重连...');
            setTimeout(connect, 3000);
        };

        ws.onerror = (e) => {
            console.error('WebSocket错误:', e);
        };
    }

    // 处理服务器消息
    function handleMessage(msg) {
        switch (msg.type) {
            case 'roomList':
                renderRoomList(msg.rooms);
                break;
            case 'roomCreated':
            case 'roomJoined':
                // 跳转前关闭WebSocket，避免触发leaveRoom
                ws.onclose = null;
                ws.close();
                sessionStorage.setItem('roomData', JSON.stringify(msg));
                window.location.href = `/games/${msg.gameType}/`;
                break;
            case 'error':
                alert(msg.message);
                break;
        }
    }

    // 渲染房间列表
    function renderRoomList(rooms) {
        if (rooms.length === 0) {
            roomList.innerHTML = '<p class="empty-tip">暂无房间，点击"创建房间"开始游戏</p>';
            return;
        }

        roomList.innerHTML = rooms.map(room => `
            <div class="room-item">
                <div class="room-info">
                    <div class="room-id">房间 #${room.id}</div>
                    <div class="room-host">房主: ${room.hostName} | ${room.playerCount}/${room.maxPlayers}人</div>
                </div>
                <button onclick="joinRoom('${room.id}')">加入</button>
            </div>
        `).join('');
    }

    // 加入房间
    window.joinRoom = function(roomId) {
        if (!playerName) {
            playerName = '玩家' + Math.floor(Math.random() * 1000);
            playerNameInput.value = playerName;
            localStorage.setItem('playerName', playerName);
        }
        ws.send(JSON.stringify({ type: 'setName', name: playerName }));
        ws.send(JSON.stringify({ type: 'joinRoom', roomId }));
    };

    // 游戏卡片点击
    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            currentGame = card.dataset.game;
            const gameNames = {
                weiqi: '围棋',
                gomoku: '五子棋',
                chess: '中国象棋',
                doudizhu: '斗地主'
            };
            modalTitle.textContent = gameNames[currentGame] + ' - 房间列表';
            roomModal.classList.remove('hidden');
            refreshRooms();
        });
    });

    // 关闭弹窗
    closeModalBtn.addEventListener('click', () => {
        roomModal.classList.add('hidden');
    });

    roomModal.addEventListener('click', (e) => {
        if (e.target === roomModal) {
            roomModal.classList.add('hidden');
        }
    });

    // 创建房间
    createRoomBtn.addEventListener('click', () => {
        if (!playerName) {
            playerName = '玩家' + Math.floor(Math.random() * 1000);
            playerNameInput.value = playerName;
            localStorage.setItem('playerName', playerName);
        }
        ws.send(JSON.stringify({ type: 'setName', name: playerName }));
        ws.send(JSON.stringify({ type: 'createRoom', gameType: currentGame }));
    });

    // 刷新房间列表
    function refreshRooms() {
        ws.send(JSON.stringify({ type: 'getRooms', gameType: currentGame }));
    }

    refreshRoomsBtn.addEventListener('click', refreshRooms);

    // 与AI对弈
    playAiBtn.addEventListener('click', () => {
        if (currentGame === 'weiqi' || currentGame === 'gomoku' || currentGame === 'chess') {
            sessionStorage.setItem('roomData', JSON.stringify({
                gameType: currentGame,
                mode: 'ai',
                roomId: 'ai-' + Date.now()
            }));
            window.location.href = `/games/${currentGame}/`;
        } else {
            alert('该游戏暂不支持AI对弈');
        }
    });

    // 通过房间号加入
    joinByIdBtn.addEventListener('click', () => {
        const roomId = roomIdInput.value.trim();
        if (roomId) {
            joinRoom(roomId);
        }
    });

    // 启动连接
    connect();
})();
