const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

app.get('/lobby', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/lobby.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/game.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Import modules
const database = require('./database');
const users = require('./users');
const wallet = require('./wallet');
const rooms = require('./rooms');
const gameEngine = require('./gameEngine');
const websocket = require('./websocket');

// Initialize modules
database.init();
websocket.init(io);

// API Routes
app.post('/api/register', users.register);
app.post('/api/login', users.login);
app.get('/api/user/:id', users.getUser);
app.get('/api/users', users.getAllUsers);

app.get('/api/wallet/balance', wallet.getBalance);
app.post('/api/wallet/deposit/request', wallet.requestDeposit);
app.post('/api/wallet/withdraw/request', wallet.requestWithdrawal);
app.get('/api/wallet/transactions', wallet.getTransactions);
app.get('/api/wallet/info', wallet.getWalletInfo);
app.post('/api/wallet/update', wallet.updateWalletInfo);

// Admin routes
app.get('/api/admin/deposits/pending', wallet.getPendingDeposits);
app.post('/api/admin/deposits/:id/approve', wallet.approveDeposit);
app.post('/api/admin/deposits/:id/reject', wallet.rejectDeposit);
app.get('/api/admin/withdrawals/pending', wallet.getPendingWithdrawals);
app.post('/api/admin/withdrawals/:id/approve', wallet.approveWithdrawal);
app.post('/api/admin/withdrawals/:id/reject', wallet.rejectWithdrawal);
app.post('/api/admin/users/:id/credits', wallet.adminUpdateCredits);
app.get('/api/admin/stats', wallet.getAdminStats);

// Game routes
app.post('/api/game/create', rooms.createRoom);
app.get('/api/game/room/:roomId', rooms.getRoom);
app.post('/api/game/join', rooms.joinRoom);

server.listen(PORT, () => {
  console.log(`🚀 السيرفر شغال على البورت ${PORT}`);
  console.log(`📱 إفتح http://localhost:${PORT} في المتصفح`);
});