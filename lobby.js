class LobbyManager {
    constructor() {
        this.socket = null;
        this.userBalance = 0;
        this.onlineUsers = [];
        this.selectedBet = 10;
        this.userId = null;
        
        this.init();
    }

    async init() {
        await this.loadUserData();
        this.setupEventListeners();
        this.connectToLobby();
        this.loadWalletInfo();
        this.loadUserStats();
    }

    async loadUserData() {
        const userData = localStorage.getItem('user');
        if (!userData) {
            window.location.href = 'login.html';
            return;
        }

        const user = JSON.parse(userData);
        this.userId = user.id;
        
        document.getElementById('userName').textContent = user.name;
        this.userBalance = user.balance;
        this.updateBalanceDisplay();

        // تحميل الرصيد المحدث من السيرفر
        try {
            const response = await this.apiCall('/api/wallet/balance');
            if (response.success) {
                this.userBalance = response.balance;
                this.updateBalanceDisplay();
            }
        } catch (error) {
            console.error('فشل في تحميل الرصيد:', error);
        }
    }

    async loadWalletInfo() {
        try {
            const response = await this.apiCall('/api/wallet/info');
            if (response.success) {
                document.getElementById('walletNumber').textContent = response.wallet.phoneNumber;
            }
        } catch (error) {
            console.error('فشل في تحميل معلومات المحفظة:', error);
        }
    }

    setupEventListeners() {
        // اختيار الرهان
        document.querySelectorAll('input[name="betAmount"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.selectedBet = parseInt(e.target.value);
            });
        });

        // زر بدء المباراة
        document.getElementById('startGame').addEventListener('click', () => {
            this.startGame();
        });

        // تعيين الرهان الافتراضي
        document.querySelector('input[value="10"]').checked = true;
    }

    connectToLobby() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            const user = JSON.parse(localStorage.getItem('user'));
            this.socket.emit('joinLobby', user);
        });

        this.socket.on('onlineUsersUpdate', (users) => {
            this.updateOnlineUsers(users);
        });

        this.socket.on('gameFound', (data) => {
            this.joinGame(data.roomId);
        });
    }

    updateOnlineUsers(users) {
        const container = document.getElementById('onlineUsers');
        const currentUser = JSON.parse(localStorage.getItem('user'));
        
        const otherUsers = users.filter(user => user.id !== currentUser.id);
        
        if (otherUsers.length === 0) {
            container.innerHTML = '<div class="text-center">لا يوجد لاعبون متصلون حالياً</div>';
            return;
        }

        container.innerHTML = otherUsers.map(user => `
            <div class="user-item">
                <span>${user.name}</span>
                <span class="balance">${user.balance} نقطة</span>
            </div>
        `).join('');
    }

    async startGame() {
        if (this.userBalance < this.selectedBet) {
            this.showMessage('رصيدك غير كافي لهذا الرهان', 'error');
            return;
        }

        this.showMessage('جاري البحث عن خصم...', 'info');

        try {
            const response = await this.apiCall('/api/game/create', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: this.userId,
                    betAmount: this.selectedBet
                })
            });

            if (response.success) {
                this.showMessage('تم إنشاء الغرفة، في انتظار الخصم...', 'success');
                
                // محاولة الانضمام لغرفة موجودة
                setTimeout(async () => {
                    await this.tryJoinRoom();
                }, 2000);
            } else {
                this.showMessage(response.message, 'error');
            }
        } catch (error) {
            this.showMessage('فشل في إنشاء المباراة', 'error');
        }
    }

    async tryJoinRoom() {
        try {
            const response = await this.apiCall('/api/game/join', {
                method: 'POST',
                body: JSON.stringify({
                    playerId: this.userId,
                    betAmount: this.selectedBet
                })
            });

            if (response.success) {
                this.joinGame(response.roomId);
            }
        } catch (error) {
            console.log('لا توجد غرف متاحة، في انتظار الخصم...');
        }
    }

    joinGame(roomId) {
        this.showMessage('تم العثور على خصم! جاري الانتقال إلى المباراة...', 'success');
        
        setTimeout(() => {
            window.location.href = `game.html?room=${roomId}`;
        }, 2000);
    }

    updateBalanceDisplay() {
        document.getElementById('userBalance').textContent = `${this.userBalance} نقطة`;
    }

    loadUserStats() {
        // في التطبيق الحقيقي، يتم التحميل من السيرفر
        document.getElementById('gamesPlayed').textContent = '0';
        document.getElementById('gamesWon').textContent = '0';
        document.getElementById('winRate').textContent = '0%';
    }

    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...options
        };

        if (options.body) {
            config.body = options.body;
        }

        try {
            const response = await fetch(endpoint, config);
            return await response.json();
        } catch (error) {
            console.error('خطأ في استدعاء API:', error);
            throw error;
        }
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
function showDepositModal() {
    document.getElementById('depositModal').style.display = 'flex';
}

function showWithdrawModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('withdrawAmount').max = user.balance;
    document.getElementById('withdrawAmount').value = Math.min(100, user.balance);
    document.getElementById('withdrawModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function requestDeposit() {
    const amount = parseInt(document.getElementById('depositAmount').value);
    const senderNumber = document.getElementById('senderNumber').value;
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (amount < 10) {
        alert('الحد الأدنى للإيداع هو 10 نقطة');
        return;
    }

    if (!senderNumber) {
        alert('يرجى إدخال رقم المرسل');
        return;
    }

    try {
        const response = await fetch('/api/wallet/deposit/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId: user.id,
                amount: amount,
                senderNumber: senderNumber
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            closeModal('depositModal');
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('فشل في عملية الإيداع');
    }
}

async function requestWithdrawal() {
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (amount < 10) {
        alert('الحد الأدنى للسحب هو 10 نقطة');
        return;
    }

    if (amount > user.balance) {
        alert('رصيدك غير كافي');
        return;
    }

    try {
        const response = await fetch('/api/wallet/withdraw/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId: user.id,
                amount: amount
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            closeModal('withdrawModal');
            
            // تحديث الرصيد
            const lobby = window.lobbyManager;
            lobby.userBalance = data.newBalance;
            lobby.updateBalanceDisplay();
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('فشل في عملية السحب');
    }
}

async function showTransactions() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
        const response = await fetch(`/api/wallet/transactions?userId=${user.id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('transactionsTableBody');
            tbody.innerHTML = data.transactions.map(transaction => `
                <tr>
                    <td>${this.getTransactionType(transaction.type)}</td>
                    <td style="color: ${transaction.amount >= 0 ? 'green' : 'red'}">
                        ${transaction.amount >= 0 ? '+' : ''}${transaction.amount}
                    </td>
                    <td>${transaction.description}</td>
                    <td>${new Date(transaction.createdAt).toLocaleString('ar-EG')}</td>
                </tr>
            `).join('');
            
            document.getElementById('transactionsModal').style.display = 'flex';
        }
    } catch (error) {
        alert('فشل في تحميل سجل المعاملات');
    }
}

function getTransactionType(type) {
    const types = {
        'deposit_request': 'طلب إيداع',
        'deposit_approved': 'إيداع معتمد',
        'deposit_rejected': 'إيداع مرفوض',
        'withdrawal_request': 'طلب سحب',
        'withdrawal_approved': 'سحب معتمد',
        'withdrawal_rejected': 'سحب مرفوض',
        'game_win': 'فوز في مباراة',
        'game_loss': 'خسارة في مباراة',
        'bet_reserved': 'حجز رهان',
        'admin_deposit': 'إضافة مدير',
        'admin_withdrawal': 'خصم مدير'
    };
    
    return types[type] || type;
}

function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}

// التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.lobbyManager = new LobbyManager();
});