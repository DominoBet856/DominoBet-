const database = require('./database');

function getBalance(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'غير مصرح' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'domino-best-secret-key');
    const user = database.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'المستخدم غير موجود' 
      });
    }

    res.json({
      success: true,
      balance: user.balance
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'رمز غير صالح' });
  }
}

function getWalletInfo(req, res) {
  res.json({
    success: true,
    wallet: database.walletInfo
  });
}

function updateWalletInfo(req, res) {
  const { phoneNumber, adminId } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'رقم المحفظة مطلوب' 
    });
  }

  database.updateWalletInfo({ phoneNumber }, adminId);

  res.json({
    success: true,
    message: 'تم تحديث رقم المحفظة بنجاح',
    wallet: database.walletInfo
  });
}

function requestDeposit(req, res) {
  const { userId, amount, senderNumber } = req.body;

  if (!userId || !amount || !senderNumber || amount <= 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'بيانات غير صالحة' 
    });
  }

  const user = database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'المستخدم غير موجود' 
    });
  }

  const deposit = database.addDeposit({
    userId,
    amount,
    senderNumber,
    userEmail: user.email,
    userName: user.name
  });

  database.addTransaction({
    userId,
    type: 'deposit_request',
    amount: 0,
    description: `طلب إيداع: ${amount} نقطة - الرقم: ${senderNumber} (قيد المراجعة)`
  });

  res.json({
    success: true,
    message: 'تم تقديم طلب الإيداع بنجاح وسيتم مراجعته',
    depositId: deposit.id
  });
}

function requestWithdrawal(req, res) {
  const { userId, amount } = req.body;

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'بيانات غير صالحة' 
    });
  }

  const user = database.getUserById(userId);
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'المستخدم غير موجود' 
    });
  }

  if (user.balance < amount) {
    return res.status(400).json({ 
      success: false, 
      message: 'الرصيد غير كافي' 
    });
  }

  user.balance -= amount;
  
  const withdrawal = database.addWithdrawal({
    userId,
    amount,
    userEmail: user.email,
    userName: user.name
  });

  database.addTransaction({
    userId,
    type: 'withdrawal_request',
    amount: -amount,
    description: `طلب سحب: ${amount} نقطة (قيد المراجعة)`
  });

  res.json({
    success: true,
    message: 'تم تقديم طلب السحب بنجاح وسيتم مراجعته',
    withdrawalId: withdrawal.id,
    newBalance: user.balance
  });
}

function getTransactions(req, res) {
  const { userId } = req.query;
  const userTransactions = database.transactions
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    transactions: userTransactions
  });
}

// وظائف المدير
function getPendingDeposits(req, res) {
  const pending = database.deposits.filter(d => d.status === 'pending');
  res.json({
    success: true,
    deposits: pending
  });
}

function getPendingWithdrawals(req, res) {
  const pending = database.withdrawals.filter(w => w.status === 'pending');
  res.json({
    success: true,
    withdrawals: pending
  });
}

function approveDeposit(req, res) {
  const { id } = req.params;
  const { adminId } = req.body;

  const deposit = database.deposits.find(d => d.id === id);
  if (!deposit) {
    return res.status(404).json({ 
      success: false, 
      message: 'طلب الإيداع غير موجود' 
    });
  }

  const user = database.getUserById(deposit.userId);
  if (user) {
    user.balance += deposit.amount;
    
    database.addTransaction({
      userId: user.id,
      type: 'deposit_approved',
      amount: deposit.amount,
      description: `موافقة على الإيداع: ${deposit.amount} نقطة`
    });
  }

  database.updateDepositStatus(id, 'approved', adminId);

  res.json({
    success: true,
    message: 'تم الموافقة على طلب الإيداع'
  });
}

function rejectDeposit(req, res) {
  const { id } = req.params;
  const { adminId } = req.body;

  const deposit = database.deposits.find(d => d.id === id);
  if (!deposit) {
    return res.status(404).json({ 
      success: false, 
      message: 'طلب الإيداع غير موجود' 
    });
  }

  database.updateDepositStatus(id, 'rejected', adminId);

  database.addTransaction({
    userId: deposit.userId,
    type: 'deposit_rejected',
    amount: 0,
    description: `رفض طلب الإيداع: ${deposit.amount} نقطة - الرقم: ${deposit.senderNumber}`
  });

  res.json({
    success: true,
    message: 'تم رفض طلب الإيداع'
  });
}

function approveWithdrawal(req, res) {
  const { id } = req.params;
  const { adminId } = req.body;

  const success = database.updateWithdrawalStatus(id, 'approved', adminId);
  
  if (!success) {
    return res.status(404).json({ 
      success: false, 
      message: 'طلب السحب غير موجود' 
    });
  }

  res.json({
    success: true,
    message: 'تم الموافقة على طلب السحب'
  });
}

function rejectWithdrawal(req, res) {
  const { id } = req.params;
  const { adminId } = req.body;

  const withdrawal = database.withdrawals.find(w => w.id === id);
  if (!withdrawal) {
    return res.status(404).json({ 
      success: false, 
      message: 'طلب السحب غير موجود' 
    });
  }

  // إعادة الرصيد للمستخدم
  const user = database.getUserById(withdrawal.userId);
  if (user) {
    user.balance += withdrawal.amount;
    
    database.addTransaction({
      userId: user.id,
      type: 'withdrawal_rejected',
      amount: withdrawal.amount,
      description: `رفض طلب السحب: ${withdrawal.amount} نقطة`
    });
  }

  database.updateWithdrawalStatus(id, 'rejected', adminId);

  res.json({
    success: true,
    message: 'تم رفض طلب السحب وإعادة الرصيد للمستخدم'
  });
}

function adminUpdateCredits(req, res) {
  const { id } = req.params;
  const { amount, action, adminId } = req.body;

  const user = database.getUserById(id);
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'المستخدم غير موجود' 
    });
  }

  const oldBalance = user.balance;
  
  if (action === 'add') {
    user.balance += amount;
    database.addTransaction({
      userId: id,
      type: 'admin_deposit',
      amount: amount,
      description: `إضافة رصيد من المدير: ${amount} نقطة`
    });
  } else if (action === 'remove') {
    if (user.balance < amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'رصيد المستخدم غير كافي' 
      });
    }
    user.balance -= amount;
    database.addTransaction({
      userId: id,
      type: 'admin_withdrawal',
      amount: -amount,
      description: `خصم رصيد من المدير: ${amount} نقطة`
    });
  }

  database.addAdminLog({
    adminId,
    action: `تحديث رصيد المستخدم`,
    target: `المستخدم: ${user.email}`,
    details: `الإجراء: ${action} - المبلغ: ${amount} - الرصيد القديم: ${oldBalance} - الرصيد الجديد: ${user.balance}`
  });

  res.json({
    success: true,
    message: `تم ${action === 'add' ? 'إضافة' : 'خصم'} ${amount} نقطة بنجاح`,
    newBalance: user.balance
  });
}

function getAdminStats(req, res) {
  const totalUsers = database.users.length;
  const totalCredits = database.users.reduce((sum, user) => sum + user.balance, 0);
  
  const totalDeposits = database.deposits
    .filter(d => d.status === 'approved')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalWithdrawals = database.withdrawals
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + w.amount, 0);

  const platformFees = database.transactions
    .filter(t => t.type === 'game_fee')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalCredits,
      totalDeposits,
      totalWithdrawals,
      platformFees,
      pendingDeposits: database.deposits.filter(d => d.status === 'pending').length,
      pendingWithdrawals: database.withdrawals.filter(w => w.status === 'pending').length
    }
  });
}

module.exports = {
  getBalance,
  getWalletInfo,
  updateWalletInfo,
  requestDeposit,
  requestWithdrawal,
  getTransactions,
  getPendingDeposits,
  getPendingWithdrawals,
  approveDeposit,
  rejectDeposit,
  approveWithdrawal,
  rejectWithdrawal,
  adminUpdateCredits,
  getAdminStats
};