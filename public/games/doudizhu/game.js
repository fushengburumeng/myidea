// 斗地主在线对弈
(function() {
    const roomData = JSON.parse(sessionStorage.getItem('roomData') || '{}');
    if (!roomData.roomId) {
        window.location.href = '/';
        return;
    }

    let ws = null;
    let mySeat = roomData.seat;
    let gameStarted = false;
    let currentPlayer = -1;
    let myCards = [];
    let selectedCards = [];
    let landlord = -1;
    let lastPlay = null;
    let phase = 'waiting';

    const roomIdEl = document.getElementById('room-id');
    const playerListEl = document.getElementById('player-list');
    const currentPlayerEl = document.getElementById('current-player');
    const landlordInfoEl = document.getElementById('landlord-info');
    const readyBtn = document.getElementById('ready-btn');
    const leaveBtn = document.getElementById('leave-btn');
    const playBtn = document.getElementById('play-btn');
    const passBtn = document.getElementById('pass-btn');
    const bidButtons = document.getElementById('bid-buttons');
    const bidYesBtn = document.getElementById('bid-yes');
    const bidNoBtn = document.getElementById('bid-no');
    const myCardsEl = document.getElementById('my-cards');
    const playAreaEl = document.getElementById('play-area');
    const dizhuCardsEl = document.getElementById('dizhu-cards');
    const dizhuDisplayEl = document.getElementById('dizhu-display');
    const playerLeftEl = document.getElementById('player-left');
    const playerRightEl = document.getElementById('player-right');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    let players = roomData.players || [{ name: localStorage.getItem('playerName') || '玩家', seat: 0, ready: false }];

    roomIdEl.textContent = roomData.roomId;
    renderPlayers();

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
                updateOtherPlayers();
                break;
            case 'playerJoined':
                players.push({ name: msg.name, seat: msg.seat, ready: false });
                renderPlayers();
                updateOtherPlayers();
                addChatMessage('系统', `${msg.name} 加入了房间`);
                break;
            case 'playerLeft':
                const leftPlayer = players.find(p => p.seat === msg.seat);
                if (leftPlayer) addChatMessage('系统', `${leftPlayer.name} 离开了房间`);
                players = players.filter(p => p.seat !== msg.seat);
                renderPlayers();
                updateOtherPlayers();
                break;
            case 'playerReady':
                const p = players.find(p => p.seat === msg.seat);
                if (p) p.ready = msg.ready;
                renderPlayers();
                break;
            case 'gameStarted':
                gameStarted = true;
                phase = 'bidding';
                currentPlayer = msg.currentPlayer;
                myCards = msg.cards;
                sortCards();
                renderMyCards();
                readyBtn.disabled = true;
                landlord = -1;
                landlordInfoEl.textContent = '叫地主中...';
                playAreaEl.innerHTML = '<p class="tip">叫地主阶段</p>';
                dizhuCardsEl.classList.add('hidden');
                updateBidButtons();
                updateOtherPlayers();
                addChatMessage('系统', '游戏开始！请叫地主');
                break;
            case 'bidUpdate':
                addChatMessage('系统', `${getPlayerName(msg.seat)} ${msg.bid ? '叫地主' : '不叫'}`);
                currentPlayer = msg.currentPlayer;
                updateBidButtons();
                updateOtherPlayers();
                break;
            case 'landlordDecided':
                landlord = msg.landlord;
                phase = 'playing';
                currentPlayer = landlord;
                landlordInfoEl.textContent = getPlayerName(landlord) + (landlord === mySeat ? ' (你)' : '');
                dizhuDisplayEl.innerHTML = msg.dizhu.map(c => createCardHTML(c, false)).join('');
                dizhuCardsEl.classList.remove('hidden');
                bidButtons.classList.add('hidden');
                playAreaEl.innerHTML = '<p class="tip">地主先出牌</p>';
                lastPlay = null;
                updateActionButtons();
                updateOtherPlayers();
                addChatMessage('系统', `${getPlayerName(landlord)} 成为地主`);
                break;
            case 'yourCards':
                myCards = msg.cards;
                sortCards();
                renderMyCards();
                break;
            case 'gameRestart':
                myCards = msg.cards;
                sortCards();
                renderMyCards();
                currentPlayer = 0;
                phase = 'bidding';
                updateBidButtons();
                addChatMessage('系统', '无人叫地主，重新发牌');
                break;
            case 'cardsPlayed':
                showPlayedCards(msg.seat, msg.cards);
                currentPlayer = msg.currentPlayer;
                lastPlay = msg.cards;
                updateActionButtons();
                updateOtherPlayers();
                break;
            case 'playerPassed':
                showPlayerPassed(msg.seat);
                currentPlayer = msg.currentPlayer;
                updateActionButtons();
                updateOtherPlayers();
                break;
            case 'gameOver':
                gameStarted = false;
                phase = 'waiting';
                readyBtn.disabled = false;
                playBtn.disabled = true;
                passBtn.disabled = true;
                bidButtons.classList.add('hidden');
                const winText = msg.winner === 'landlord' ? '地主获胜！' : '农民获胜！';
                const ddzIsWinner = (msg.winner === 'landlord' && mySeat === landlord) ||
                                    (msg.winner === 'farmers' && mySeat !== landlord);
                addChatMessage('系统', `游戏结束！${winText}`);
                showGameEndEffect(ddzIsWinner, ddzIsWinner ? '你赢了！' : '你输了');
                break;
            case 'gameEnded':
                gameStarted = false;
                phase = 'waiting';
                readyBtn.disabled = false;
                playBtn.disabled = true;
                passBtn.disabled = true;
                bidButtons.classList.add('hidden');
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

    function getPlayerName(seat) {
        const p = players.find(pl => pl.seat === seat);
        return p ? p.name : '玩家' + seat;
    }

    function renderPlayers() {
        playerListEl.innerHTML = [0, 1, 2].map(seat => {
            const p = players.find(pl => pl.seat === seat);
            const isLandlord = landlord === seat;
            if (p) {
                return `<div class="player-item ${p.ready ? 'ready' : ''} ${gameStarted && currentPlayer === seat ? 'current' : ''}">
                    <span>${p.name}${seat === mySeat ? ' (你)' : ''}${isLandlord ? ' 👑' : ''}</span>
                    <span class="status-text ${p.ready ? 'ready' : ''}">${p.ready ? '已准备' : '未准备'}</span>
                </div>`;
            } else {
                return `<div class="player-item"><span>座位${seat + 1}: 等待加入...</span></div>`;
            }
        }).join('');
    }

    function updateOtherPlayers() {
        // 计算左右玩家的座位
        const leftSeat = (mySeat + 2) % 3;
        const rightSeat = (mySeat + 1) % 3;

        [
            { el: playerLeftEl, seat: leftSeat },
            { el: playerRightEl, seat: rightSeat }
        ].forEach(({ el, seat }) => {
            const p = players.find(pl => pl.seat === seat);
            const nameEl = el.querySelector('.player-name');
            const countEl = el.querySelector('.card-count');
            const actionEl = el.querySelector('.player-action');

            if (p) {
                const isLandlord = landlord === seat;
                nameEl.textContent = p.name + (isLandlord ? ' 👑' : '');
                if (gameStarted && phase === 'playing') {
                    // 显示剩余牌数（简化：假设17张，地主20张）
                    countEl.innerHTML = `<span class="card-back"></span>`.repeat(3);
                } else {
                    countEl.innerHTML = '';
                }
                actionEl.textContent = currentPlayer === seat ? '思考中...' : '';
            } else {
                nameEl.textContent = '等待加入...';
                countEl.innerHTML = '';
                actionEl.textContent = '';
            }
        });
    }

    function sortCards() {
        myCards.sort((a, b) => b.rank - a.rank);
    }

    function renderMyCards() {
        myCardsEl.innerHTML = myCards.map((card, index) => {
            const selected = selectedCards.some(c => c.suit === card.suit && c.value === card.value);
            return createCardHTML(card, selected, index);
        }).join('');

        // 绑定点击事件
        myCardsEl.querySelectorAll('.card').forEach((el, index) => {
            el.addEventListener('click', () => toggleCardSelection(index));
        });
    }

    function createCardHTML(card, selected, index = 0) {
        const isRed = card.suit === '♥' || card.suit === '♦' || card.value === '大王';
        const isJoker = card.value === '小王' || card.value === '大王';
        return `<div class="card ${isRed ? 'red' : ''} ${selected ? 'selected' : ''}" data-index="${index}">
            <div class="value">${card.value}</div>
            ${!isJoker ? `<div class="suit">${card.suit}</div>` : ''}
        </div>`;
    }

    function toggleCardSelection(index) {
        if (phase !== 'playing' || currentPlayer !== mySeat) return;

        const card = myCards[index];
        const idx = selectedCards.findIndex(c => c.suit === card.suit && c.value === card.value);
        if (idx === -1) {
            selectedCards.push(card);
        } else {
            selectedCards.splice(idx, 1);
        }
        renderMyCards();
        playBtn.disabled = selectedCards.length === 0;
    }

    function updateBidButtons() {
        if (phase === 'bidding' && currentPlayer === mySeat) {
            bidButtons.classList.remove('hidden');
        } else {
            bidButtons.classList.add('hidden');
        }
    }

    function updateActionButtons() {
        if (phase === 'playing' && currentPlayer === mySeat) {
            playBtn.disabled = selectedCards.length === 0;
            passBtn.disabled = lastPlay === null; // 新一轮不能pass
        } else {
            playBtn.disabled = true;
            passBtn.disabled = true;
        }
    }

    function showPlayedCards(seat, cards) {
        if (seat === mySeat) {
            // 从手牌中移除
            for (const card of cards) {
                const idx = myCards.findIndex(c => c.suit === card.suit && c.value === card.value);
                if (idx !== -1) myCards.splice(idx, 1);
            }
            selectedCards = [];
            renderMyCards();
        }

        playAreaEl.innerHTML = `<div class="played-info">${getPlayerName(seat)} 出牌:</div>` +
            cards.map(c => createCardHTML(c, false)).join('');
    }

    function showPlayerPassed(seat) {
        playAreaEl.innerHTML = `<div class="played-info">${getPlayerName(seat)} 不出</div>`;
    }

    // 事件绑定
    readyBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'ready' }));
    });

    leaveBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'leaveRoom' }));
    });

    bidYesBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'gameAction', action: 'bid', bid: true }));
    });

    bidNoBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'gameAction', action: 'bid', bid: false }));
    });

    playBtn.addEventListener('click', () => {
        if (selectedCards.length > 0) {
            ws.send(JSON.stringify({ type: 'gameAction', action: 'play', cards: selectedCards }));
        }
    });

    passBtn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'gameAction', action: 'pass' }));
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
