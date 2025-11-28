class DominoGame {
  constructor(roomId, betAmount) {
    this.roomId = roomId;
    this.betAmount = betAmount;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.board = [];
    this.stock = [];
    this.gameState = 'waiting'; // waiting, playing, finished
    this.winner = null;
    this.timer = null;
    this.turnTimeLeft = 20;
    this.startTime = new Date();
  }

  initializeGame() {
    // إنشاء جميع قطع الدومينو (28 قطعة)
    this.tiles = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        this.tiles.push([i, j]);
      }
    }

    this.shuffleTiles();
    this.distributeTiles();
    this.gameState = 'playing';
    this.determineFirstPlayer();
  }

  shuffleTiles() {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  distributeTiles() {
    this.players.forEach(player => {
      player.tiles = this.tiles.splice(0, 7);
      player.canPlay = true;
    });
    this.stock = this.tiles; // القطع المتبقية تذهب للمخزون
  }

  determineFirstPlayer() {
    // البحث عن لاعب لديه أكبر قطعة مزدوجة
    let highestDouble = -1;
    let firstPlayerIndex = 0;

    this.players.forEach((player, index) => {
      player.tiles.forEach(tile => {
        if (tile[0] === tile[1] && tile[0] > highestDouble) {
          highestDouble = tile[0];
          firstPlayerIndex = index;
        }
      });
    });

    // إذا لم يوجد قطع مزدوجة، اختيار عشوائي
    if (highestDouble === -1) {
      firstPlayerIndex = Math.floor(Math.random() * this.players.length);
    }

    this.currentPlayerIndex = firstPlayerIndex;
    this.startTurnTimer();
  }

  addPlayer(player) {
    this.players.push({
      id: player.id,
      name: player.name,
      tiles: [],
      score: 0,
      canPlay: true,
      balanceChange: 0
    });
  }

  playTile(playerId, tileIndex, placement) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.currentPlayer().id !== playerId) {
      return { success: false, message: 'ليس دورك للعب' };
    }

    const tile = player.tiles[tileIndex];
    if (!tile) {
      return { success: false, message: 'القطعة غير موجودة' };
    }

    if (this.board.length === 0) {
      // الحركة الأولى يجب أن تكون قطعة مزدوجة
      if (tile[0] !== tile[1]) {
        return { success: false, message: 'يجب أن تبدأ بقطعة مزدوجة' };
      }
      this.board.push({ tile, placedBy: playerId, position: 'center' });
    } else {
      const validMove = this.isValidMove(tile, placement);
      if (!validMove) {
        return { success: false, message: 'حركة غير صالحة' };
      }

      this.board.push({ 
        tile, 
        placedBy: playerId, 
        position: placement.position,
        connectedTo: placement.connectedTo
      });
    }

    // إزالة القطعة من يد اللاعب
    player.tiles.splice(tileIndex, 1);

    // التحقق إذا فاز اللاعب
    if (player.tiles.length === 0) {
      this.gameState = 'finished';
      this.winner = playerId;
      this.distributeRewards();
      return { 
        success: true, 
        gameFinished: true, 
        winner: playerId,
        message: `${player.name} فاز بالمباراة!`
      };
    }

    // الانتقال للاعب التالي
    this.nextTurn();
    return { success: true, gameFinished: false };
  }

  isValidMove(tile, placement) {
    if (this.board.length === 0) return true;

    const [leftEnd, rightEnd] = this.getBoardEnds();
    
    if (placement.position === 'left') {
      return tile[0] === leftEnd || tile[1] === leftEnd;
    } else if (placement.position === 'right') {
      return tile[0] === rightEnd || tile[1] === rightEnd;
    }

    return false;
  }

  getBoardEnds() {
    if (this.board.length === 0) return [null, null];
    
    const firstTile = this.board[0].tile;
    const lastTile = this.board[this.board.length - 1].tile;
    
    let leftEnd = firstTile[0];
    let rightEnd = lastTile[1];

    // تعديل اتجاه الوضع
    this.board.forEach(placement => {
      if (placement.position === 'left') {
        leftEnd = placement.tile[0] === leftEnd ? placement.tile[1] : placement.tile[0];
      }
    });

    return [leftEnd, rightEnd];
  }

  drawFromStock(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.currentPlayer().id !== playerId) {
      return { success: false, message: 'ليس دورك' };
    }

    if (this.stock.length === 0) {
      return { success: false, message: 'لا توجد قطع متاحة في المخزون' };
    }

    player.tiles.push(this.stock.pop());
    this.nextTurn();
    
    return { success: true, tiles: player.tiles };
  }

  currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.turnTimeLeft = 20;
    this.startTurnTimer();
  }

  startTurnTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      this.turnTimeLeft--;
      
      if (this.turnTimeLeft <= 0) {
        this.handleTurnTimeout();
      }
    }, 1000);
  }

  handleTurnTimeout() {
    const currentPlayer = this.currentPlayer();
    currentPlayer.canPlay = false;
    
    // التحقق إذا كان جميع اللاعبين لا يستطيعون اللعب
    const allCannotPlay = this.players.every(player => !player.canPlay);
    
    if (allCannotPlay) {
      this.endGameByBlock();
    } else {
      this.nextTurn();
    }
  }

  endGameByBlock() {
    this.gameState = 'finished';
    
    // البحث عن اللاعب بأقل نقاط
    let minPoints = Infinity;
    let winnerId = null;
    
    this.players.forEach(player => {
      const points = player.tiles.reduce((sum, tile) => sum + tile[0] + tile[1], 0);
      if (points < minPoints) {
        minPoints = points;
        winnerId = player.id;
      }
    });
    
    this.winner = winnerId;
    this.distributeRewards();
  }

  distributeRewards() {
    const totalPot = this.betAmount * 2;
    const winnerShare = Math.floor(totalPot * 0.75); // 75% للفائز
    const platformFee = totalPot - winnerShare; // 25% للمنصة

    // تحديث أرصدة اللاعبين
    this.players.forEach(player => {
      if (player.id === this.winner) {
        player.balanceChange = winnerShare;
      } else {
        player.balanceChange = -this.betAmount;
      }
    });

    this.platformFee = platformFee;
  }

  getGameState() {
    return {
      roomId: this.roomId,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        tilesCount: p.tiles.length,
        canPlay: p.canPlay
      })),
      currentPlayer: this.currentPlayer(),
      board: this.board,
      stockCount: this.stock.length,
      gameState: this.gameState,
      winner: this.winner,
      turnTimeLeft: this.turnTimeLeft,
      betAmount: this.betAmount,
      startTime: this.startTime
    };
  }

  getPlayerState(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;

    return {
      playerTiles: player.tiles,
      gameState: this.getGameState()
    };
  }
}

module.exports = DominoGame;