const { v4: uuidv4 } = require('uuid');
const DominoGame = require('./gameEngine');
const database = require('./database');

const waitingPlayers = {}; // لاعبون ينتظرون مباراة بنفس مبلغ الرهان
const activeGames = {}; // غرف الألعاب النشطة

function createRoom(req, res) {
  const { playerId, betAmount } = req.body;

  if (!playerId || !betAmount) {
    return res.status(400).json({ 
      success: false, 
      message: 'بيانات غير مكتملة' 
    });
  }

  const user = database.getUserById(playerId);
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'المستخدم غير موجود' 
    });
  }

  if (user.balance < betAmount) {
    return res.status(400).json({ 
      success: false, 
      message: 'الرصيد غير كافي' 
    });
  }

  const roomId = uuidv4();
  const game = new DominoGame(roomId, betAmount);
  
  activeGames[roomId] = game;
  database.gameRooms.push({
    id: roomId,
    betAmount,
    players: [playerId],
    createdAt: new Date().toISOString(),
    status: 'waiting'
  });

  // حجز مبلغ الرهان
  user.balance -= betAmount;
  database.addTransaction({
    userId: playerId,
    type: 'bet_reserved',
    amount: -betAmount,
    description: `حجز رهان للمباراة: ${betAmount} نقطة`
  });

  res.json({
    success: true,
    roomId,
    message: 'تم إنشاء الغرفة بنجاح، في انتظار الخصم'
  });
}

function joinRoom(req, res) {
  const { playerId, betAmount } = req.body;

  if (!playerId || !betAmount) {
    return res.status(400).json({ 
      success: false, 
      message: 'بيانات غير مكتملة' 
    });
  }

  const user = database.getUserById(playerId);
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'المستخدم غير موجود' 
    });
  }

  if (user.balance < betAmount) {
    return res.status(404).json({ 
      success: false, 
      message: 'الرصيد غير كافي' 
    });
  }

  // البحث عن غرفة انتظار بنفس مبلغ الرهان
  const waitingRoom = database.gameRooms.find(room => 
    room.status === 'waiting' && 
    room.betAmount === betAmount && 
    !room.players.includes(playerId)
  );

  if (!waitRoom) {
    return res.status(404).json({ 
      success: false, 
      message: 'لا توجد غرف متاحة لهذا المبلغ' 
    });
  }

  const game = activeGames[waitingRoom.id];
  if (!game) {
    return res.status(404).json({ 
      success: false, 
      message: 'اللعبة غير موجودة' 
    });
  }

  // إضافة اللاعب للعبة
  game.addPlayer({
    id: user.id,
    name: user.name
  });

  // حجز مبلغ الرهان
  user.balance -= betAmount;
  database.addTransaction({
    userId: playerId,
    type: 'bet_reserved',
    amount: -betAmount,
    description: `حجز رهان للمباراة: ${betAmount} نقطة`
  });

  // تحديث الغرفة
  waitingRoom.players.push(playerId);
  waitingRoom.status = 'playing';

  // بدء اللعبة
  game.initializeGame();

  res.json({
    success: true,
    roomId: waitingRoom.id,
    message: 'تم الانضمام إلى الغرفة بنجاح'
  });
}

function getRoom(req, res) {
  const { roomId } = req.params;
  const game = activeGames[roomId];

  if (!game) {
    return res.status(404).json({ 
      success: false, 
      message: 'الغرفة غير موجودة' 
    });
  }

  res.json({
    success: true,
    room: game.getGameState()
  });
}

function getAvailableRooms() {
  return database.gameRooms.filter(room => room.status === 'waiting');
}

function getPlayerGame(playerId) {
  return database.gameRooms.find(room => 
    room.players.includes(playerId) && room.status === 'playing'
  );
}

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  getAvailableRooms,
  getPlayerGame,
  activeGames
};