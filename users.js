const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('./database');

const JWT_SECRET = 'domino-best-secret-key';

function register(req, res) {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ 
      success: false, 
      message: 'جميع الحقول مطلوبة' 
    });
  }

  if (database.getUserByEmail(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'البريد الإلكتروني مستخدم بالفعل' 
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = database.createUser({
    email,
    password: hashedPassword,
    name
  });

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);

  res.json({
    success: true,
    message: 'تم إنشاء الحساب بنجاح',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      balance: user.balance
    },
    token
  });
}

function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'البريد الإلكتروني وكلمة المرور مطلوبان' 
    });
  }

  const user = database.getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ 
      success: false, 
      message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
    });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);

  res.json({
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      balance: user.balance,
      isAdmin: user.isAdmin
    },
    token
  });
}

function getUser(req, res) {
  const { id } = req.params;
  const user = database.getUserById(id);
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'المستخدم غير موجود' 
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      balance: user.balance,
      createdAt: user.createdAt
    }
  });
}

function getAllUsers(req, res) {
  const users = database.users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    balance: user.balance,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt
  }));

  res.json({
    success: true,
    users
  });
}

module.exports = {
  register,
  login,
  getUser,
  getAllUsers
};