// عرض صندوق إنشاء الحساب
function showRegister() {
    document.getElementById("registerBox").style.display = "block";
}

// إخفاء صندوق إنشاء الحساب
function hideRegister() {
    document.getElementById("registerBox").style.display = "none";
}

// إنشاء حساب جديد
function register() {
    let email = document.getElementById("regEmail").value;
    let password = document.getElementById("regPassword").value;

    if (!email || !password) {
        alert("من فضلك اكمل البيانات");
        return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];

    // التأكد إن الإيميل مش مستخدم قبل كدة
    if (users.find(u => u.email === email)) {
        alert("هذا البريد مسجل بالفعل");
        return;
    }

    users.push({ email, password });
    localStorage.setItem("users", JSON.stringify(users));

    alert("تم إنشاء الحساب بنجاح!");
    hideRegister();
}

// تسجيل الدخول
function login() {
    let email = document.getElementById("loginEmail").value;
    let password = document.getElementById("loginPassword").value;

    let users = JSON.parse(localStorage.getItem("users")) || [];

    let found = users.find(u => u.email === email && u.password === password);

    if (found) {
        alert("تم تسجيل الدخول!");

        // حفظ المستخدم الحالي
        localStorage.setItem("currentUser", JSON.stringify(found));

        // الانتقال للوحة التحكم
        window.location.href = "dashboard.html";

    } else {
        alert("البريد أو كلمة المرور غير صحيحة");
    }
}