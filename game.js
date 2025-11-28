class DominoGame {
    constructor() {
        this.socket = null;
        this.roomId = this.getQueryParam('room');
        this.currentUser = null;
        this.gameState = null;
        this.playerTiles = [];
        this.selectedTileIndex = null;
        this.timerInterval = null;
        
        this.init();
    }

    async init() {
        await this.validateAccess();
        this.setupEventListeners();
        this.connectToGame();
        this.loadInitialGameState();
    }

    async validateAccess() {
        this.currentUser = JSON.parse(localStorage.getItem('user'));
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        if (!this.roomId) {
            this.showMessage('معرف الغرفة غير موجود', 'error');
            setTimeout(() => window.location.href = 'lobby.html', 2000);
            return;
        }

        document.getElementById('playerName').textContent = this.currentUser.name;
        document.getElementById('roomId').textContent = `الغرفة: ${this.roomId.substring(0, 8)}`;
    }

    setupEventListeners() {
        // زر سحب قطعة
        document.getElementById('drawTile').addEventListener('click', () => {
            this.drawTile();
        });

        // إدخال الدردشة
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
    }

    connectToGame() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.socket.emit('joinGame', {
                roomId: this.roomId,
                userId: this.currentUser.id
            });
        });

        this.socket.on('gameState', (gameState) => {
            this.handleGameState(gameState);
        });

        this.socket.on('gameUpdate', (gameState) => {
            this.updateGameState(gameState);
        });

        this.socket.on('playerJoined', (data) => {
            this.showMessage(`انضم ${data.playerId === this.currentUser.id ? 'أنت' : 'الخصم'} إلى المباراة`, 'info');
            this.updateGameState(data.gameState);
        });

        this.socket.on('playerDisconnected', (data) => {
            this.showMessage('انقطع اتصال الخصم', 'warning');
            document.getElementById('opponentStatus').textContent = '🔴 منقطع';
        });

        this.socket.on('gameFinished', (data) => {
            this.handleGameFinished(data);
        });

        this.socket.on('chatMessage', (data) => {
            this.displayChatMessage(data);
        });

        this.socket.on('error', (error) => {
            this.showMessage(error.message, 'error');
        });
    }

    handleGameState(gameState) {
        this.playerTiles = gameState.playerTiles;
        this.gameState = gameState.gameState;
        this.renderGame();
    }

    updateGameState(gameState) {
        this.gameState = gameState;
        this.renderGame();
    }

    renderGame() {
        if (!this.gameState) return;

        this.renderPlayerTiles();
        this.renderBoard();
        this.renderOpponentInfo();
        this.updateGameInfo();
        this.updateTurnTimer();
    }

    renderPlayerTiles() {
        const container = document.getElementById('playerTiles');
        
        if (!this.playerTiles || this.playerTiles.length === 0) {
            container.innerHTML = '<div class="loading">جاري تحميل القطع...</div>';
            return;
        }

        container.innerHTML = this.playerTiles.map((tile, index) => `
            <div class="domino-tile ${this.selectedTileIndex === index ? 'selected' : ''}" 
                 onclick="window.game.selectTile(${index})">
                <span>${tile[0]}</span>
                <span>${tile[1]}</span>
            </div>
        `).join('');
    }

    renderBoard() {
        const board = document.getElementById('gameBoard');
        
        if (!this.gameState.board || this.gameState.board.length === 0) {
            board.innerHTML = '<div class="board-center"><p>لم تبدأ المباراة بعد. انتظر الخصم...</p></div>';
            return;
        }

        board.innerHTML = this.gameState.board.map(placement => `
            <div class="domino-tile ${placement.placedBy === this.currentUser.id ? 'player-tile' : 'opponent-tile'}">
                <span>${placement.tile[0]}</span>
                <span>${placement.tile[1]}</span>
            </div>
        `).join('');
    }

    renderOpponentInfo() {
        if (!this.gameState.players) return;

        const opponent = this.gameState.players.find(p => p.id !== this.currentUser.id);
        if (opponent) {
            document.getElementById('opponentName').textContent = opponent.name;
            document.getElementById('opponentTilesCount').textContent = opponent.tilesCount;
            
            // عرض قطع الخصم كمستطيلات فارغة
            const opponentTilesContainer = document.getElementById('opponentTiles');
            opponentTilesContainer.innerHTML = Array(opponent.tilesCount).fill(0).map(() => `
                <div class="domino-tile"></div>
            `).join('');
        }
    }

    updateGameInfo() {
        if (!this.gameState) return;

        document.getElementById('playerTilesCount').textContent = this.playerTiles.length;
        document.getElementById('stockCount').textContent = this.gameState.stockCount;

        const isMyTurn = this.gameState.currentPlayer?.id === this.currentUser.id;
        document.getElementById('turnIndicator').textContent = isMyTurn ? '✅' : '❌';
        document.getElementById('currentTurn').textContent = isMyTurn ? 'دورك الآن' : `دور ${this.gameState.currentPlayer?.name}`;

        // تفعيل/تعطيل عناصر التحكم بناءً على الدور
        document.getElementById('drawTile').disabled = !isMyTurn;
    }

    updateTurnTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        const timerElement = document.getElementById('gameTimer');
        if (!this.gameState.turnTimeLeft) return;

        let timeLeft = this.gameState.turnTimeLeft;
        timerElement.textContent = timeLeft;
        timerElement.style.color = '#f39c12';

        this.timerInterval = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 5) {
                timerElement.style.color = '#e74c3c';
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
            }
        }, 1000);
    }

    selectTile(index) {
        if (this.gameState.currentPlayer?.id !== this.currentUser.id) {
            this.showMessage('ليس دورك للعب', 'warning');
            return;
        }

        this.selectedTileIndex = index;
        this.renderPlayerTiles();

        // اللعب التلقائي إذا كانت الحركة الأولى أو هناك مكان واحد فقط
        if (this.gameState.board.length === 0) {
            this.playTile('center');
        } else {
            this.showPlacementOptions();
        }
    }

    showPlacementOptions() {
        if (this.selectedTileIndex === null) return;

        const tile = this.playerTiles[this.selectedTileIndex];
        const [leftEnd, rightEnd] = this.getBoardEnds();

        const canPlayLeft = tile[0] === leftEnd || tile[1] === leftEnd;
        const canPlayRight = tile[0] === rightEnd || tile[1] === rightEnd;

        if (canPlayLeft && canPlayRight) {
            // عرض الخيارين
            if (confirm('اختر مكان وضع القطعة:\n\nموافق = اليسار\nإلغاء = اليمين')) {
                this.playTile('left');
            } else {
                this.playTile('right');
            }
        } else if (canPlayLeft) {
            this.playTile('left');
        } else if (canPlayRight) {
            this.playTile('right');
        } else {
            this.showMessage('لا يمكن وضع هذه القطعة في أي مكان', 'error');
            this.selectedTileIndex = null;
            this.renderPlayerTiles();
        }
    }

    getBoardEnds() {
        if (!this.gameState.board || this.gameState.board.length === 0) {
            return [null, null];
        }

        const firstTile = this.gameState.board[0].tile;
        const lastTile = this.gameState.board[this.gameState.board.length - 1].tile;

        return [firstTile[0], lastTile[1]];
    }

    playTile(position) {
        if (this.selectedTileIndex === null) return;

        this.socket.emit('playTile', {
            roomId: this.roomId,
            userId: this.currentUser.id,
            tileIndex: this.selectedTileIndex,
            placement: {
                position: position,
                connectedTo: position === 'left' ? 0 : this.gameState.board.length - 1
            }
        });

        this.selectedTileIndex = null;
    }

    drawTile() {
        if (this.gameState.currentPlayer?.id !== this.currentUser.id) {
            this.showMessage('ليس دورك للعب', 'warning');
            return;
        }

        this.socket.emit('drawTile', {
            roomId: this.roomId,
            userId: this.currentUser.id
        });
    }

    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (message) {
            this.socket.emit('chatMessage', {
                roomId: this.roomId,
                message: message,
                userName: this.currentUser.name
            });

            input.value = '';
        }
    }

    displayChatMessage(data) {
        const container = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <strong>${data.userName}:</strong> ${data.message}
            <small style="color: #7f8c8d; font-size: 0.8rem;">${new Date(data.timestamp).toLocaleTimeString('ar-EG')}</small>
        `;

        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
    }

    handleGameFinished(data) {
        this.showGameOverModal(data);
    }

    showGameOverModal(data) {
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameResultTitle');
        const details = document.getElementById('gameResultDetails');

        const isWinner = data.winner === this.currentUser.id;
        
        title.textContent = isWinner ? '🎉 مبروك! لقد فزت!' : '💔 انتهت المباراة';
        title.style.color = isWinner ? '#27ae60' : '#e74c3c';

        const winnerName = data.winnerName || 'الخصم';
        const playerChange = data.balanceChanges.find(change => change.playerId === this.currentUser.id);
        
        details.innerHTML = `
            <div style="text-align: center; margin: 20px 0;">
                <p>الفائز: <strong>${winnerName}</strong></p>
                <p style="font-size: 1.2em; margin: 10px 0;">
                    تغيير الرصيد: 
                    <strong style="color: ${playerChange.balanceChange > 0 ? '#27ae60' : '#e74c3c'}">
                        ${playerChange.balanceChange > 0 ? '+' : ''}${playerChange.balanceChange} نقطة
                    </strong>
                </p>
                <p>رسوم المنصة: <strong>${data.platformFee} نقطة</strong></p>
            </div>
        `;

        modal.style.display = 'flex';
    }

    loadInitialGameState() {
        // تحميل الحالة الأولية للعبة
        fetch(`/api/game/room/${this.roomId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.gameState = data.room;
                    this.renderGame();
                }
            })
            .catch(error => {
                console.error('Error loading game state:', error);
            });
    }

    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    showMessage(message, type = 'info') {
        // إنشاء إشعار
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-weight: 600;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// الدوال العامة
function leaveGame() {
    if (confirm('هل تريد ترك المباراة؟ سيتم احتسابها خسارة.')) {
        window.location.href = 'lobby.html';
    }
}

function sendChatMessage() {
    if (window.game) {
        window.game.sendChatMessage();
    }
}

function returnToLobby() {
    window.location.href = 'lobby.html';
}

function playAgain() {
    window.location.href = 'lobby.html';
}

// تهيئة اللعبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.game = new DominoGame();
});