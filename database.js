const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// قاعدة البيانات في الذاكرة
let users = [];
let transactions = [];
let deposits = [];
let withdrawals = [];
let gameRooms = [];
let adminLogs = [];
let walletInfo = {
  phoneNumber: '+201234567890',
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system'
};

// تهيئة البيانات الأولية
function init() {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  users = [
    {
      id: '1',
      email: 'admin@dominobest.com',
      password: hashedPassword,
      name: 'مدير النظام',
      balance: 0,
      isAdmin: true,
      createdAt: new Date().toISOString()
    }
  ];

  // إضافة مستخدمين تجريبيين
  for (let i = 1; i <= 5; i++) {
    users.push({
      id: uuidv4(),
      email: `user${i}@example.com`,
      password: bcrypt.hashSync('password123', 10),
      name: `مستخدم ${i}`,
      balance: 1000,
      isAdmin: false,
      createdAt: new Date().toISOString()
    });
  }

  console.log('✅ قاعدة البيانات جاهزة');
}

function getUserByEmail(email) {
  return users.find(user => user.email === email);
}

function getUserById(id) {
  return users.find(user => user.id === id);
}

function createUser(userData) {
  const user = {
    id: uuidv4(),
    ...userData,
    balance: 100, // رصيد ابتدائي
    isAdmin: false,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  return user;
}

function updateUserBalance(userId, newBalance) {
  const user = getUserById(userId);
  if (user) {
    user.balance = newBalance;
    return true;
  }
  return false;
}

function addTransaction(transaction) {
  transactions.push({
    id: uuidv4(),
    ...transaction,
    createdAt: new Date().toISOString()
  });
}

function addDeposit(deposit) {
  const depositData = {
    id: uuidv4(),
    ...deposit,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  deposits.push(depositData);
  return depositData;
}

function addWithdrawal(withdrawal) {
  const withdrawalData = {
    id: uuidv4(),
    ...withdrawal,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  withdrawals.push(withdrawalData);
  return withdrawalData;
}

function updateDepositStatus(depositId, status, adminId) {
  const deposit = deposits.find(d => d.id === depositId);
  if (deposit) {
    deposit.status = status;
    deposit.processedAt = new Date().toISOString();
    deposit.processedBy = adminId;
    
    addAdminLog({
      adminId,
      action: `تحديث حالة الإيداع إلى: ${status}`,
      target: `طلب إيداع: ${depositId}`,
      details: `المبلغ: ${deposit.amount} - الرقم: ${deposit.senderNumber}`
    });
    
    return true;
  }
  return false;
}

function updateWithdrawalStatus(withdrawalId, status, adminId) {
  const withdrawal = withdrawals.find(w => w.id === withdrawalId);
  if (withdrawal) {
    withdrawal.status = status;
    withdrawal.processedAt = new Date().toISOString();
    withdrawal.processedBy = adminId;
    
    addAdminLog({
      adminId,
      action: `تحديث حالة السحب إلى: ${status}`,
      target: `طلب سحب: ${withdrawalId}`,
      details: `المبلغ: ${withdrawal.amount}`
    });
    
    return true;
  }
  return false;
}

function updateWalletInfo(newInfo, adminId) {
  walletInfo = {
    ...walletInfo,
    ...newInfo,
    lastUpdated: new Date().toISOString(),
    updatedBy: adminId
  };
  
  addAdminLog({
    adminId,
    action: 'تحديث معلومات المحفظة',
    target: 'المحفظة الرئيسية',
    details: `رقم جديد: ${newInfo.phoneNumber}`
  });
}

function addAdminLog(log) {
  adminLogs.push({
    id: uuidv4(),
    ...log,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  init,
  users,
  transactions,
  deposits,
  withdrawals,
  gameRooms,
  adminLogs,
  walletInfo,
  getUserByEmail,
  getUserById,
  createUser,
  updateUserBalance,
  addTransaction,
  addDeposit,
  addWithdrawal,
  updateDepositStatus,
  updateWithdrawalStatus,
  updateWalletInfo,
  addAdminLog
};