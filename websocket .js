const rooms = require('./rooms');
const database = require('./database');

let io;

function init(socketIo) {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log('👤 مستخدم متصل:', socket.id);

    socket.on('joinLobby', (userData) => {
      socket.join('lobby');
      socket.userData = userData;
      
      // بث تحديث المستخدمين المتصلين
      updateOnlineUsers();
    });

    socket.on('joinGame', (data) => {
      const { roomId, userId } = data;
      socket.join(roomId);
      socket.currentRoom = roomId;
      
      const game = rooms.activeGames[roomId];
      if (game) {
        socket.emit('gameState', game.getPlayerState(userId));
        
        // إشعار اللاعبين الآخرين
        socket.to(roomId).emit('playerJoined', {
          playerId: userId,
          gameState: game.getGameState()
        });
      }
    });

    socket.on('playTile', (data) => {
      const { roomId, userId, tileIndex, placement } = data;
      const game = rooms.activeGames[roomId];
      
      if (!game) {
        socket.emit('error', { message: 'اللعبة غير موجودة' });
        return;
      }

      const result = game.playTile(userId, tileIndex, placement);
      
      if (result.success) {
        // بث حالة اللعبة المحدثة لجميع اللاعبين في الغرفة
        io.to(roomId).emit('gameUpdate', game.getGameState());
        
        if (result.gameFinished) {
          // التعامل مع انتهاء اللعبة
          handleGameCompletion(game, roomId);
        }
      } else {
        socket.emit('error', { message: result.message });
      }
    });

    socket.on('drawTile', (data) => {
      const { roomId, userId } = data;
      const game = rooms.activeGames[roomId];
      
      if (!game) {
        socket.emit('error', { message: 'اللعبة غير موجودة' });
        return;
      }

      const result = game.drawFromStock(userId);
      
      if (result.success) {
        io.to(roomId).emit('gameUpdate', game.getGameState());
        socket.emit('playerTilesUpdate', result.tiles);
      } else {
        socket.emit('error', { message: result.message });
      }
    });

    socket.on('chatMessage', (data) => {
      const { roomId, message, userName } = data;
      io.to(roomId).emit('chatMessage', {
        userName,
        message,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log('👤 مستخدم منقطع:', socket.id);
      
      if (socket.userData) {
        updateOnlineUsers();
      }
      
      // التعامل مع انقطاع اللاعب من اللعبة
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('playerDisconnected', {
          playerId: socket.userData?.id
        });
      }
    });
  });
}

function updateOnlineUsers() {
  const onlineUsers = [];
  
  io.sockets.sockets.forEach(socket => {
    if (socket.userData) {
      onlineUsers.push(socket.userData);
    }
  });
  
  io.to('lobby').emit('onlineUsersUpdate', onlineUsers);
}

function handleGameCompletion(game, roomId) {
  // تحديث أرصدة اللاعبين في قاعدة البيانات
  game.players.forEach(player => {
    const user = database.getUserById(player.id);
    if (user && player.balanceChange) {
      user.balance += player.balanceChange;
      
      const transactionType = player.balanceChange > 0 ? 'game_win' : 'game_loss';
      database.addTransaction({
        userId: player.id,
        type: transactionType,
        amount: player.balanceChange,
        description: player.balanceChange > 0 
          ? `فوز في المباراة: +${player.balanceChange} نقطة` 
          : `خسارة في المباراة: ${player.balanceChange} نقطة`
      });
    }
  });

  // إضافة معاملة رسوم المنصة
  if (game.platformFee > 0) {
    database.addTransaction({
      userId: 'system',
      type: 'game_fee',
      amount: game.platformFee,
      description: `رسوم المنصة من المباراة: ${game.platformFee} نقطة`
    });
  }

  // تحديث حالة الغرفة
  const room = database.gameRooms.find(r => r.id === roomId);
  if (room) {
    room.status = 'finished';
    room.finishedAt = new Date().toISOString();
    room.winner = game.winner;
  }

  // إشعار اللاعبين
  io.to(roomId).emit('gameFinished', {
    winner: game.winner,
    winnerName: game.players.find(p => p.id === game.winner)?.name,
    balanceChanges: game.players.map(p => ({
      playerId: p.id,
      balanceChange: p.balanceChange
    })),
    platformFee: game.platformFee
  });

  // التنظيف بعد تأخير
  setTimeout(() => {
    delete rooms.activeGames[roomId];
    io.socketsLeave(roomId);
  }, 30000); // التنظيف بعد 30 ثانية
}

module.exports = {
  init
};