// جلب المستخدم الحالي
let currentUser = localStorage.getItem("currentUser");

if (!currentUser) {
    window.location.href = "index.html"; // لو مفيش مستخدم رجعه للصفحة الرئيسية
}

currentUser = JSON.parse(currentUser);

// جلب كل المستخدمين
let users = JSON.parse(localStorage.getItem("users")) || [];

// البحث عن بيانات نفس المستخدم
let found = users.find(u => u.email === currentUser.email);

// عرض الرصيد
document.getElementById("balance").innerText = found.balance + " جنيه";

function play() {
    alert("هندخل غرفة المراهنات بعد ما نضيفها، خطوة خطوة 🔥");
}