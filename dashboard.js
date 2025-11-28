class AdminDashboard {
    constructor() {
        this.currentAdmin = null;
        this.users = [];
        this.deposits = [];
        this.withdrawals = [];
        this.transactions = [];
        
        this.init();
    }

    async init() {
        await this.validateAdminAccess();
        this.setupEventListeners();
        this.loadDashboardData();
        this.setupRealTimeUpdates();
    }

    async validateAdminAccess() {
        this.currentAdmin = JSON.parse(localStorage.getItem('user'));
        
        if (!this.currentAdmin) {
            window.location.href = 'login.html';
            return;
        }

        if (!this.currentAdmin.isAdmin) {
            alert('ليس لديك صلاحية الوصول إلى لوحة التحكم');
            window.location.href = 'lobby.html';
            return;
        }

        document.getElementById('adminName').textContent = this.currentAdmin.name;
    }

    setupEventListeners() {
        // يتم التعامل مع التبويبات في HTML
    }

    async loadDashboardData() {
        await this.loadStats();
        await this.loadUsers();
        await this.loadDeposits();
        await this.loadWithdrawals();
        await this.loadWalletInfo();
    }

    async loadStats() {
        try {
            const response = await this.apiCall('/api/admin/stats');
            if (response.success) {
                this.updateStatsDisplay(response.stats);
            }
        } catch (error) {
            this.showMessage('فشل في تحميل الإحصائيات', 'error');
        }
    }

    async loadUsers() {
        try {
            const response = await this.apiCall('/api/users');
            if (response.success) {
                this.users = response.users;
                this.renderUsersTable();
            }
        } catch (error) {
            this.showMessage('فشل في تحميل قائمة المستخدمين', 'error');
        }
    }

    async loadDeposits() {
        try {
            const response = await this.apiCall('/api/admin/deposits/pending');
            if (response.success) {
                this.deposits = response.deposits;
                this.renderDepositsTable();
            }
        } catch (error) {
            this.showMessage('فشل في تحميل طلبات الإيداع', 'error');
        }
    }

    async loadWithdrawals() {
        try {
            const response = await this.apiCall('/api/admin/withdrawals/pending');
            if (response.success) {
                this.withdrawals = response.withdrawals;
                this.renderWithdrawalsTable();
            }
        } catch (error) {
            this.showMessage('فشل في تحميل طلبات السحب', 'error');
        }
    }

    async loadWalletInfo() {
        try {
            const response = await this.apiCall('/api/wallet/info');
            if (response.success) {
                document.getElementById('currentWalletNumber').textContent = response.wallet.phoneNumber;
            }
        } catch (error) {
            this.showMessage('فشل في تحميل معلومات المحفظة', 'error');
        }
    }

    updateStatsDisplay(stats) {
        document.getElementById('totalUsers').textContent = this.formatNumber(stats.totalUsers);
        document.getElementById('totalCredits').textContent = this.formatNumber(stats.totalCredits);
        document.getElementById('pendingDeposits').textContent = this.formatNumber(stats.pendingDeposits);
        document.getElementById('pendingWithdrawals').textContent = this.formatNumber(stats.pendingWithdrawals);
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        
        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.name} ${user.isAdmin ? '👑' : ''}</td>
                <td>${user.email}</td>
                <td><strong>${this.formatNumber(user.balance)}</strong> نقطة</td>
                <td>${this.formatDate(user.createdAt)}</td>
                <td>
                    <button onclick="window.dashboard.editUserCredits('${user.id}')" class="btn btn-small btn-primary">تعديل الرصيد</button>
                    ${!user.isAdmin ? `
                        <button onclick="window.dashboard.viewUserTransactions('${user.id}')" class="btn btn-small btn-info">المعاملات</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }

    renderDepositsTable() {
        const tbody = document.getElementById('depositsTableBody');
        
        if (this.deposits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد طلبات إيداع معلقة</td></tr>';
            return;
        }

        tbody.innerHTML = this.deposits.map(deposit => `
            <tr>
                <td>${deposit.userName}</td>
                <td>${deposit.userEmail}</td>
                <td><strong>${this.formatNumber(deposit.amount)}</strong> نقطة</td>
                <td>${deposit.senderNumber}</td>
                <td>${this.formatDate(deposit.createdAt)}</td>
                <td>
                    <button onclick="window.dashboard.approveDeposit('${deposit.id}')" class="btn btn-small btn-success">موافقة</button>
                    <button onclick="window.dashboard.rejectDeposit('${deposit.id}')" class="btn btn-small btn-danger">رفض</button>
                </td>
            </tr>
        `).join('');
    }

    renderWithdrawalsTable() {
        const tbody = document.getElementById('withdrawalsTableBody');
        
        if (this.withdrawals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد طلبات سحب معلقة</td></tr>';
            return;
        }

        tbody.innerHTML = this.withdrawals.map(withdrawal => `
            <tr>
                <td>${withdrawal.userName}</td>
                <td>${withdrawal.userEmail}</td>
                <td><strong>${this.formatNumber(withdrawal.amount)}</strong> نقطة</td>
                <td>${this.formatDate(withdrawal.createdAt)}</td>
                <td>
                    <button onclick="window.dashboard.approveWithdrawal('${withdrawal.id}')" class="btn btn-small btn-success">موافقة</button>
                    <button onclick="window.dashboard.rejectWithdrawal('${withdrawal.id}')" class="btn btn-small btn-danger">رفض</button>
                </td>
            </tr>
        `).join('');
    }

    editUserCredits(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('userCreditsTitle').textContent = `تعديل رصيد ${user.name}`;
        document.getElementById('modalUserName').textContent = user.name;
        document.getElementById('modalCurrentBalance').textContent = `${this.formatNumber(user.balance)} نقطة`;
        document.getElementById('creditAmount').value = '100';
        document.getElementById('creditAction').value = 'add';
        
        // تخزين معرف المستخدم الحالي للتحديث
        this.currentEditingUserId = userId;
        
        document.getElementById('userCreditsModal').style.display = 'flex';
    }

    async updateUserCredits() {
        const amount = parseInt(document.getElementById('creditAmount').value);
        const action = document.getElementById('creditAction').value;

        if (!amount || amount <= 0) {
            this.showMessage('يرجى إدخال مبلغ صحيح', 'error');
            return;
        }

        try {
            const response = await this.apiCall(`/api/admin/users/${this.currentEditingUserId}/credits`, {
                method: 'POST',
                body: JSON.stringify({
                    amount: amount,
                    action: action,
                    adminId: this.currentAdmin.id
                })
            });

            if (response.success) {
                this.showMessage(response.message, 'success');
                this.closeModal('userCreditsModal');
                
                // تحديث البيانات
                await this.loadUsers();
                await this.loadStats();
            } else {
                this.showMessage(response.message, 'error');
            }
        } catch (error) {
            this.showMessage('فشل في تحديث رصيد المستخدم', 'error');
        }
    }

    async approveDeposit(depositId) {
        if (!confirm('هل تريد الموافقة على طلب الإيداع هذا؟')) return;

        try {
            const response = await this.apiCall(`/api/admin/deposits/${depositId}/approve`, {
                method: 'POST',
                body: JSON.stringify({
                    adminId: this.currentAdmin.id
                })
            });

            if (response.success) {
                this.showMessage(response.message, 'success');
                await this.loadDeposits();
                await this.loadStats();
            } else {
                this.showMessage(response.message, 'error');
            }
        } catch (error) {
            this.showMessage('فشل في معالجة طلب الإيداع', 'error');
        }
    }

    async rejectDeposit(depositId) {
        if (!confirm('هل تريد رفض طلب الإيداع هذا؟')) return;

        try {
            const response = await this.apiCall(`/api/admin/deposits/${depositId}/reject`, {
                method: 'POST',
                body: JSON.stringify({
                    adminId: this.currentAdmin.id
                })
            });

            if (response.success) {
                this.showMessage(response.message, 'success');
                await this.loadDeposits();
                await this.loadStats();
            } else {
                this.showMessage(response.message, 'error');
            }
        } catch (error) {
            this.showMessage('فشل في معالجة طلب الإيداع', 'error');
        }
    }

    async approveWithdrawal(withdrawalId) {
        if (!confirm('هل تريد الموافقة على طلب السحب هذا؟')) return;

        try {
            const response = await this.apiCall(`/api/admin/withdrawals/${withdrawalId}/approve`, {
                method: 'POST',
                body: JSON.stringify({
                    adminId: this.currentAdmin.id
                })
            });

            if (response.success) {
                this.showMessage(response.message, 'success');
                await this.loadWithdrawals();
                await this.loadStats();
            } else {
                this.showMessage(response.message, 'error');
            }
        } catch (error) {
            this.showMessage('فشل في معالجة طلب السحب', 'error');
        }
    }

    async rejectWithdrawal(withdrawalId) {
        if (!confirm('هل تريد رفض طلب السحب هذا؟ سيتم إعادة الرصيد للمستخدم.')) return;

        try {
            const response = await this.apiCall(`/api/admin/withdrawals/${withdrawalId}/reject`, {
                method: 'POST',
                body: JSON.stringify({
                    adminId: this.currentAdmin.id
                })
            });

            if (response.success) {
                this.showMessage(response.message, 'success');
                await this.loadWithdrawals();
                await this.loadStats();
            } else {
                this.showMessage(response.message, 'error');
            }
        } catch (error) {
            this.showMessage('فشل في معالجة طلب السحب', 'error');
        }
    }

    async updateWalletNumber() {
        const newNumber = document.getElementById('newWalletNumber').value.trim();
        
        if (!newNumber) {
            this.showMessage('يرجى إدخال رقم المحفظة', 'error');
            return;
        }

        try {
            const response = await this.apiCall('/api/wallet/update', {
                method: 'POST',
                body: JSON.stringify({
                    phoneNumber: newNumber,
                    adminId: this.currentAdmin.id
                })
            });

            if (response.success) {
                this.showMessage(response.message, 'success');
                document.getElementById('currentWalletNumber').textContent = newNumber;
                document.getElementById('newWalletNumber').value = '';
            } else {
                this.showMessage(response.message, 'error');
            }
        } catch (error) {
            this.showMessage('فشل في تحديث رقم المحفظة', 'error');
        }
    }

    viewUserTransactions(userId) {
        this.showMessage(`عرض معاملات المستخدم (${userId}) - هذه الميزة قيد التطوير`, 'info');
    }

    setupRealTimeUpdates() {
        // في التطبيق الحقيقي، إعداد مستمعي WebSocket للتحديثات الفورية
        setInterval(() => {
            this.loadStats();
            this.loadDeposits();
            this.loadWithdrawals();
        }, 30000); // تحديث كل 30 ثانية
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

    formatNumber(num) {
        return new Intl.NumberFormat('ar-EG').format(num);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleString('ar-EG');
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

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
}

// الدوال العامة
function openTab(tabName) {
    // إخفاء جميع محتويات التبويبات
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // إزالة الفئة النشطة من جميع الأزرار
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // إظهار محتوى التبويب المحدد
    document.getElementById(tabName).classList.add('active');
    
    // إضافة الفئة النشطة للزر الم