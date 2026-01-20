// UI交互
(function() {
    let game, renderer, ai;
    let gameMode = 'pvp';
    let hoverPos = null;

    // DOM元素
    const canvas = document.getElementById('board');
    const gameModeSelect = document.getElementById('game-mode');
    const boardSizeSelect = document.getElementById('board-size');
    const aiDifficultySelect = document.getElementById('ai-difficulty');
    const showLibertiesCheckbox = document.getElementById('show-liberties');
    const showInfluenceCheckbox = document.getElementById('show-influence');
    const apiKeyInput = document.getElementById('api-key');
    const newGameBtn = document.getElementById('new-game');
    const undoBtn = document.getElementById('undo');
    const passBtn = document.getElementById('pass');
    const resignBtn = document.getElementById('resign');
    const askTeacherBtn = document.getElementById('ask-teacher');
    const toggleSettingsBtn = document.getElementById('toggle-settings');
    const toggleRulesBtn = document.getElementById('toggle-rules');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings');
    const closeTeacherBtn = document.getElementById('close-teacher');
    const settingsModal = document.getElementById('settings-modal');
    const rulesPanel = document.getElementById('rules-panel');
    const teacherPanel = document.getElementById('teacher-panel');
    const teacherContent = document.getElementById('teacher-content');
    const currentColorEl = document.getElementById('current-color');
    const currentTextEl = document.getElementById('current-text');
    const blackCapturesEl = document.getElementById('black-captures');
    const whiteCapturesEl = document.getElementById('white-captures');

    // 加载保存的设置
    function loadSettings() {
        const saved = localStorage.getItem('weiqi-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (settings.apiKey) apiKeyInput.value = settings.apiKey;
            if (settings.difficulty) aiDifficultySelect.value = settings.difficulty;
            if (settings.showLiberties) showLibertiesCheckbox.checked = settings.showLiberties;
            if (settings.showInfluence) showInfluenceCheckbox.checked = settings.showInfluence;
        }
    }

    // 保存设置
    function saveSettings() {
        const settings = {
            apiKey: apiKeyInput.value,
            difficulty: aiDifficultySelect.value,
            showLiberties: showLibertiesCheckbox.checked,
            showInfluence: showInfluenceCheckbox.checked
        };
        localStorage.setItem('weiqi-settings', JSON.stringify(settings));
    }

    function init() {
        loadSettings();
        const size = parseInt(boardSizeSelect.value);
        const difficulty = aiDifficultySelect.value;
        game = new GoGame(size);
        renderer = new BoardRenderer(canvas, game);
        renderer.showLiberties = showLibertiesCheckbox.checked;
        renderer.showInfluence = showInfluenceCheckbox.checked;
        ai = new GoAI(game, difficulty);
        gameMode = gameModeSelect.value;
        updateUI();
        renderer.draw();

        if (gameMode === 'pve-white') {
            setTimeout(aiMove, 300);
        }
    }

    function updateUI() {
        currentColorEl.className = 'stone ' + (game.currentPlayer === 1 ? 'black' : 'white');
        currentTextEl.textContent = game.currentPlayer === 1 ? '黑方' : '白方';
        blackCapturesEl.textContent = game.captures[1];
        whiteCapturesEl.textContent = game.captures[2];
    }

    function aiMove() {
        if (game.gameOver) return;
        const move = ai.getMove();
        if (move) {
            game.place(move[0], move[1]);
        } else {
            game.pass();
        }
        updateUI();
        renderer.draw();
        if (game.gameOver) showGameOver();
    }

    function isAITurn() {
        if (gameMode === 'pve-black' && game.currentPlayer === 2) return true;
        if (gameMode === 'pve-white' && game.currentPlayer === 1) return true;
        return false;
    }

    function showGameOver() {
        const territory = game.calculateTerritory();
        const blackScore = territory[1] + game.captures[1];
        const whiteScore = territory[2] + game.captures[2] + 6.5;
        let message = `游戏结束！\n\n`;
        message += `黑方: ${territory[1]}目 + ${game.captures[1]}提子 = ${blackScore}分\n`;
        message += `白方: ${territory[2]}目 + ${game.captures[2]}提子 + 6.5贴目 = ${whiteScore}分\n\n`;
        message += blackScore > whiteScore ? '黑方胜！' : '白方胜！';
        setTimeout(() => alert(message), 100);
    }

    // 生成棋盘状态描述
    function getBoardDescription() {
        const size = game.size;
        let desc = `当前是${size}×${size}棋盘，${game.currentPlayer === 1 ? '黑方' : '白方'}执子。\n`;
        desc += `黑方已提${game.captures[1]}子，白方已提${game.captures[2]}子。\n`;
        desc += `已下${game.history.length}手。\n\n`;

        // 棋盘状态
        const cols = 'ABCDEFGHJKLMNOPQRST'.slice(0, size);
        desc += '棋盘状态（X=黑，O=白，.=空）:\n';
        desc += '  ' + cols.split('').join(' ') + '\n';
        for (let y = 0; y < size; y++) {
            let row = (size - y).toString().padStart(2) + ' ';
            for (let x = 0; x < size; x++) {
                const stone = game.board[x][y];
                row += (stone === 0 ? '.' : stone === 1 ? 'X' : 'O') + ' ';
            }
            desc += row + '\n';
        }

        return desc;
    }

    // 请求DeepSeek指导
    async function askTeacher() {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('请先在设置中填写DeepSeek API密钥');
            settingsModal.classList.remove('hidden');
            return;
        }

        teacherPanel.classList.remove('hidden');
        teacherContent.innerHTML = '<p class="loading">正在分析局面，请稍候...</p>';
        askTeacherBtn.disabled = true;

        const boardDesc = getBoardDescription();
        const prompt = `你是一位围棋老师，正在指导一位初学者下棋。

${boardDesc}

请分析当前局面，给出指导建议：
1. 当前局势评估（谁占优势，大概领先多少）
2. 双方的强弱棋群分析
3. 推荐的下一步落子位置（用字母+数字表示，如D4）及原因
4. 需要注意的要点或围棋概念讲解

请用简洁易懂的语言，适合初学者理解。`;

        try {
            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const advice = data.choices[0].message.content;
            teacherContent.innerHTML = advice;
        } catch (error) {
            teacherContent.innerHTML = `<p class="error">请求失败: ${error.message}</p>`;
        } finally {
            askTeacherBtn.disabled = false;
        }
    }

    // 事件监听
    canvas.addEventListener('click', function(e) {
        if (game.gameOver || isAITurn()) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const pos = renderer.toBoard(x, y);
        if (pos && game.place(pos[0], pos[1])) {
            updateUI();
            renderer.draw();
            if (game.gameOver) {
                showGameOver();
            } else if (isAITurn()) {
                setTimeout(aiMove, 300);
            }
        }
    });

    canvas.addEventListener('mousemove', function(e) {
        if (game.gameOver || isAITurn()) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        hoverPos = renderer.toBoard(x, y);
        renderer.draw();
        if (hoverPos && game.canPlace(hoverPos[0], hoverPos[1])) {
            renderer.drawPreview(hoverPos[0], hoverPos[1]);
        }
    });

    canvas.addEventListener('mouseleave', function() {
        hoverPos = null;
        renderer.draw();
    });

    newGameBtn.addEventListener('click', init);

    undoBtn.addEventListener('click', function() {
        if (gameMode !== 'pvp' && game.history.length >= 2) {
            game.undo();
            game.undo();
        } else {
            game.undo();
        }
        updateUI();
        renderer.draw();
    });

    passBtn.addEventListener('click', function() {
        if (game.gameOver || isAITurn()) return;
        game.pass();
        updateUI();
        renderer.draw();
        if (game.gameOver) {
            showGameOver();
        } else if (isAITurn()) {
            setTimeout(aiMove, 300);
        }
    });

    resignBtn.addEventListener('click', function() {
        if (game.gameOver) return;
        const winner = game.currentPlayer === 1 ? '白方' : '黑方';
        game.gameOver = true;
        alert(`${game.currentPlayer === 1 ? '黑方' : '白方'}认输，${winner}胜！`);
    });

    askTeacherBtn.addEventListener('click', askTeacher);

    gameModeSelect.addEventListener('change', function() {
        gameMode = this.value;
        init();
    });

    boardSizeSelect.addEventListener('change', init);

    // 设置弹窗
    toggleSettingsBtn.addEventListener('click', function() {
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', function() {
        settingsModal.classList.add('hidden');
    });

    saveSettingsBtn.addEventListener('click', function() {
        saveSettings();
        ai.setDifficulty(aiDifficultySelect.value);
        renderer.showLiberties = showLibertiesCheckbox.checked;
        renderer.showInfluence = showInfluenceCheckbox.checked;
        renderer.draw();
        settingsModal.classList.add('hidden');
    });

    settingsModal.addEventListener('click', function(e) {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });

    // 规则面板
    toggleRulesBtn.addEventListener('click', function() {
        rulesPanel.classList.toggle('hidden');
    });

    // 指导面板
    closeTeacherBtn.addEventListener('click', function() {
        teacherPanel.classList.add('hidden');
    });

    // 初始化
    init();
})();
