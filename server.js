const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 房间管理
const rooms = new Map();
let roomIdCounter = 1;

// 生成房间ID
function generateRoomId() {
    return String(roomIdCounter++).padStart(4, '0');
}

// 广播给房间内所有玩家
function broadcastToRoom(roomId, message, excludeWs = null) {
    const room = rooms.get(roomId);
    if (!room) return;
    const data = JSON.stringify(message);
    room.players.forEach(player => {
        if (player.ws !== excludeWs && player.ws.readyState === 1) {
            player.ws.send(data);
        }
    });
}

// 发送给单个玩家
function sendTo(ws, message) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(message));
    }
}

// 获取房间列表
function getRoomList(gameType) {
    const list = [];
    rooms.forEach((room, id) => {
        if (room.gameType === gameType && room.status === 'waiting') {
            list.push({
                id,
                gameType: room.gameType,
                playerCount: room.players.length,
                maxPlayers: room.maxPlayers,
                hostName: room.players[0]?.name || '未知'
            });
        }
    });
    return list;
}

// WebSocket连接处理
wss.on('connection', (ws) => {
    ws.playerData = { roomId: null, name: '玩家' };

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            handleMessage(ws, msg);
        } catch (e) {
            console.error('消息解析错误:', e);
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });
});

// 处理消息
function handleMessage(ws, msg) {
    switch (msg.type) {
        case 'setName':
            ws.playerData.name = msg.name || '玩家';
            break;

        case 'getRooms':
            sendTo(ws, { type: 'roomList', rooms: getRoomList(msg.gameType) });
            break;

        case 'createRoom':
            createRoom(ws, msg);
            break;

        case 'joinRoom':
            joinRoom(ws, msg.roomId);
            break;

        case 'leaveRoom':
            leaveRoom(ws);
            break;

        case 'ready':
            handleReady(ws);
            break;

        case 'gameAction':
            handleGameAction(ws, msg);
            break;

        case 'chat':
            handleChat(ws, msg.text);
            break;
    }
}

// 创建房间
function createRoom(ws, msg) {
    const roomId = generateRoomId();
    const maxPlayers = msg.gameType === 'doudizhu' ? 3 : 2;

    const room = {
        id: roomId,
        gameType: msg.gameType,
        maxPlayers,
        status: 'waiting',
        players: [{
            ws,
            name: ws.playerData.name,
            ready: false,
            seat: 0
        }],
        gameState: null
    };

    rooms.set(roomId, room);
    ws.playerData.roomId = roomId;

    sendTo(ws, {
        type: 'roomCreated',
        roomId,
        seat: 0,
        gameType: msg.gameType
    });
}

// 加入房间
function joinRoom(ws, roomId) {
    const room = rooms.get(roomId);
    if (!room) {
        sendTo(ws, { type: 'error', message: '房间不存在' });
        return;
    }

    // 检查是否是已有玩家重新连接（通过名字匹配）
    const existingPlayer = room.players.find(p => p.name === ws.playerData.name);
    if (existingPlayer) {
        // 更新 ws 引用
        existingPlayer.ws = ws;
        ws.playerData.roomId = roomId;
        sendTo(ws, {
            type: 'roomJoined',
            roomId,
            seat: existingPlayer.seat,
            gameType: room.gameType,
            players: room.players.map(p => ({ name: p.name, seat: p.seat, ready: p.ready }))
        });
        return;
    }

    if (room.players.length >= room.maxPlayers) {
        sendTo(ws, { type: 'error', message: '房间已满' });
        return;
    }
    if (room.status !== 'waiting') {
        sendTo(ws, { type: 'error', message: '游戏已开始' });
        return;
    }

    const seat = room.players.length;
    room.players.push({
        ws,
        name: ws.playerData.name,
        ready: false,
        seat
    });
    ws.playerData.roomId = roomId;

    // 通知新玩家
    sendTo(ws, {
        type: 'roomJoined',
        roomId,
        seat,
        gameType: room.gameType,
        players: room.players.map(p => ({ name: p.name, seat: p.seat, ready: p.ready }))
    });

    // 通知其他玩家
    broadcastToRoom(roomId, {
        type: 'playerJoined',
        name: ws.playerData.name,
        seat
    }, ws);
}

// 离开房间
function leaveRoom(ws) {
    const roomId = ws.playerData.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.ws === ws);
    if (playerIndex === -1) return;

    const seat = room.players[playerIndex].seat;
    room.players.splice(playerIndex, 1);
    ws.playerData.roomId = null;

    if (room.players.length === 0) {
        rooms.delete(roomId);
    } else {
        broadcastToRoom(roomId, {
            type: 'playerLeft',
            seat
        });
        // 如果游戏进行中，结束游戏
        if (room.status === 'playing') {
            room.status = 'waiting';
            room.gameState = null;
            broadcastToRoom(roomId, { type: 'gameEnded', reason: '玩家离开' });
        }
    }

    sendTo(ws, { type: 'leftRoom' });
}

// 处理准备
function handleReady(ws) {
    const roomId = ws.playerData.roomId;
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.ws === ws);
    if (!player) return;

    player.ready = !player.ready;
    broadcastToRoom(roomId, {
        type: 'playerReady',
        seat: player.seat,
        ready: player.ready
    });

    // 检查是否所有人都准备好了
    if (room.players.length === room.maxPlayers && room.players.every(p => p.ready)) {
        startGame(room);
    }
}

// 开始游戏
function startGame(room) {
    room.status = 'playing';
    room.gameState = initGameState(room.gameType, room.players.length);

    const baseMsg = {
        type: 'gameStarted',
        gameType: room.gameType
    };

    // 斗地主需要发牌
    if (room.gameType === 'doudizhu') {
        room.players.forEach((player, index) => {
            sendTo(player.ws, {
                ...baseMsg,
                cards: room.gameState.hands[index],
                currentPlayer: room.gameState.currentPlayer
            });
        });
    } else {
        broadcastToRoom(room.id, {
            ...baseMsg,
            currentPlayer: 0
        });
    }
}

// 初始化游戏状态
function initGameState(gameType, playerCount) {
    switch (gameType) {
        case 'weiqi':
            return { board: Array(19).fill(null).map(() => Array(19).fill(0)), currentPlayer: 0, captures: [0, 0] };
        case 'gomoku':
            return { board: Array(15).fill(null).map(() => Array(15).fill(0)), currentPlayer: 0 };
        case 'chess':
            return { board: initChessBoard(), currentPlayer: 0 };
        case 'doudizhu':
            return initDoudizhuState();
        default:
            return {};
    }
}

// 初始化象棋棋盘
function initChessBoard() {
    // 0=空, 正数=红方, 负数=黑方
    // 1车 2马 3象 4士 5帅 6炮 7兵
    const board = Array(10).fill(null).map(() => Array(9).fill(0));
    // 黑方 (上方)
    board[0] = [-1, -2, -3, -4, -5, -4, -3, -2, -1];
    board[2][1] = -6; board[2][7] = -6;
    board[3] = [-7, 0, -7, 0, -7, 0, -7, 0, -7];
    // 红方 (下方)
    board[9] = [1, 2, 3, 4, 5, 4, 3, 2, 1];
    board[7][1] = 6; board[7][7] = 6;
    board[6] = [7, 0, 7, 0, 7, 0, 7, 0, 7];
    return board;
}

// 初始化斗地主
function initDoudizhuState() {
    const deck = [];
    const suits = ['♠', '♥', '♣', '♦'];
    const values = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value, rank: values.indexOf(value) });
        }
    }
    deck.push({ suit: '', value: '小王', rank: 13 });
    deck.push({ suit: '', value: '大王', rank: 14 });

    // 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return {
        hands: [deck.slice(0, 17), deck.slice(17, 34), deck.slice(34, 51)],
        dizhu: deck.slice(51, 54),
        landlord: -1,
        currentPlayer: 0,
        lastPlay: null,
        lastPlayer: -1,
        passed: [false, false, false],
        phase: 'bidding',
        bids: []
    };
}

// 处理游戏动作
function handleGameAction(ws, msg) {
    const roomId = ws.playerData.roomId;
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    const player = room.players.find(p => p.ws === ws);
    if (!player) return;

    const state = room.gameState;

    switch (room.gameType) {
        case 'weiqi':
        case 'gomoku':
            handleBoardGame(room, player, msg);
            break;
        case 'chess':
            handleChess(room, player, msg);
            break;
        case 'doudizhu':
            handleDoudizhu(room, player, msg);
            break;
    }
}

// 处理棋类游戏
function handleBoardGame(room, player, msg) {
    const state = room.gameState;
    if (player.seat !== state.currentPlayer) return;

    if (msg.action === 'place') {
        const { x, y } = msg;
        if (state.board[x][y] !== 0) return;

        state.board[x][y] = player.seat + 1;
        state.currentPlayer = 1 - state.currentPlayer;

        broadcastToRoom(room.id, {
            type: 'gameUpdate',
            action: 'place',
            x, y,
            player: player.seat,
            currentPlayer: state.currentPlayer
        });

        // 检查胜负 (五子棋)
        if (room.gameType === 'gomoku') {
            if (checkGomokuWin(state.board, x, y)) {
                broadcastToRoom(room.id, { type: 'gameOver', winner: player.seat });
                room.status = 'ended';
            }
        }
    } else if (msg.action === 'pass') {
        state.currentPlayer = 1 - state.currentPlayer;
        broadcastToRoom(room.id, {
            type: 'gameUpdate',
            action: 'pass',
            player: player.seat,
            currentPlayer: state.currentPlayer
        });
    }
}

// 检查五子棋胜负
function checkGomokuWin(board, x, y) {
    const color = board[x][y];
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

    for (const [dx, dy] of directions) {
        let count = 1;
        for (let i = 1; i < 5; i++) {
            const nx = x + dx * i, ny = y + dy * i;
            if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && board[nx][ny] === color) count++;
            else break;
        }
        for (let i = 1; i < 5; i++) {
            const nx = x - dx * i, ny = y - dy * i;
            if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && board[nx][ny] === color) count++;
            else break;
        }
        if (count >= 5) return true;
    }
    return false;
}

// 处理象棋
function handleChess(room, player, msg) {
    const state = room.gameState;
    if (player.seat !== state.currentPlayer) return;

    if (msg.action === 'move') {
        const { fromX, fromY, toX, toY } = msg;
        const piece = state.board[fromY][fromX];

        // 简单验证：确保是自己的棋子
        if ((player.seat === 0 && piece <= 0) || (player.seat === 1 && piece >= 0)) return;

        state.board[toY][toX] = piece;
        state.board[fromY][fromX] = 0;
        state.currentPlayer = 1 - state.currentPlayer;

        broadcastToRoom(room.id, {
            type: 'gameUpdate',
            action: 'move',
            fromX, fromY, toX, toY,
            currentPlayer: state.currentPlayer
        });

        // 检查将帅是否被吃
        let redKing = false, blackKing = false;
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 9; x++) {
                if (state.board[y][x] === 5) redKing = true;
                if (state.board[y][x] === -5) blackKing = true;
            }
        }
        if (!redKing) {
            broadcastToRoom(room.id, { type: 'gameOver', winner: 1 });
            room.status = 'ended';
        } else if (!blackKing) {
            broadcastToRoom(room.id, { type: 'gameOver', winner: 0 });
            room.status = 'ended';
        }
    }
}

// 处理斗地主
function handleDoudizhu(room, player, msg) {
    const state = room.gameState;

    if (state.phase === 'bidding') {
        if (msg.action === 'bid') {
            state.bids.push({ seat: player.seat, bid: msg.bid });

            if (msg.bid) {
                state.landlord = player.seat;
            }

            if (state.bids.length === 3) {
                if (state.landlord === -1) {
                    // 没人叫地主，重新发牌
                    room.gameState = initDoudizhuState();
                    room.players.forEach((p, i) => {
                        sendTo(p.ws, {
                            type: 'gameRestart',
                            cards: room.gameState.hands[i]
                        });
                    });
                } else {
                    // 地主拿底牌
                    state.hands[state.landlord].push(...state.dizhu);
                    state.phase = 'playing';
                    state.currentPlayer = state.landlord;

                    broadcastToRoom(room.id, {
                        type: 'landlordDecided',
                        landlord: state.landlord,
                        dizhu: state.dizhu
                    });

                    sendTo(room.players[state.landlord].ws, {
                        type: 'yourCards',
                        cards: state.hands[state.landlord]
                    });
                }
            } else {
                state.currentPlayer = (state.currentPlayer + 1) % 3;
                broadcastToRoom(room.id, {
                    type: 'bidUpdate',
                    seat: player.seat,
                    bid: msg.bid,
                    currentPlayer: state.currentPlayer
                });
            }
        }
    } else if (state.phase === 'playing') {
        if (player.seat !== state.currentPlayer) return;

        if (msg.action === 'play') {
            const cards = msg.cards;
            // 从手牌中移除打出的牌
            for (const card of cards) {
                const idx = state.hands[player.seat].findIndex(c =>
                    c.suit === card.suit && c.value === card.value);
                if (idx !== -1) state.hands[player.seat].splice(idx, 1);
            }

            state.lastPlay = cards;
            state.lastPlayer = player.seat;
            state.passed = [false, false, false];
            state.currentPlayer = (state.currentPlayer + 1) % 3;

            broadcastToRoom(room.id, {
                type: 'cardsPlayed',
                seat: player.seat,
                cards,
                currentPlayer: state.currentPlayer
            });

            // 检查是否出完
            if (state.hands[player.seat].length === 0) {
                const landlordWin = player.seat === state.landlord;
                broadcastToRoom(room.id, {
                    type: 'gameOver',
                    winner: landlordWin ? 'landlord' : 'farmers'
                });
                room.status = 'ended';
            }
        } else if (msg.action === 'pass') {
            state.passed[player.seat] = true;
            state.currentPlayer = (state.currentPlayer + 1) % 3;

            // 如果其他两人都pass了
            if (state.passed.filter(p => p).length === 2) {
                state.lastPlay = null;
                state.passed = [false, false, false];
            }

            broadcastToRoom(room.id, {
                type: 'playerPassed',
                seat: player.seat,
                currentPlayer: state.currentPlayer
            });
        }
    }
}

// 处理聊天
function handleChat(ws, text) {
    const roomId = ws.playerData.roomId;
    if (!roomId) return;
    broadcastToRoom(roomId, {
        type: 'chat',
        name: ws.playerData.name,
        text
    });
}

// 处理断开连接
function handleDisconnect(ws) {
    leaveRoom(ws);
}

const PORT = process.env.PORT || 9527;
server.listen(PORT, () => {
    console.log(`游戏服务器运行在 http://localhost:${PORT}`);
});
