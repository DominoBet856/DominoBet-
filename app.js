// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBFsD4TEPao-FUIxdDs6XZx7B1D1tuJv3A",
  authDomain: "dominobet-6cb3a.firebaseapp.com",
  projectId: "dominobet-6cb3a",
  storageBucket: "dominobet-6cb3a.firebasestorage.app",
  messagingSenderId: "344534788642",
  appId: "1:344534788642:web:456e5425b506b98cee787b",
  measurementId: "G-VP7Q13TFQQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Show register box
function showRegister() {
    document.querySelector(".login-box").classList.add("hidden");
    document.querySelector(".register-box").classList.remove("hidden");
}

// Hide register box
function hideRegister() {
    document.querySelector(".register-box").classList.add("hidden");
    document.querySelector(".login-box").classList.remove("hidden");
}

// Register function
window.register = function () {
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;

    createUserWithEmailAndPassword(auth, email, password)
    .then(() => alert("تم إنشاء الحساب بنجاح!"))
    .catch(err => alert(err.message));
}

// Login function
window.login = function () {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    signInWithEmailAndPassword(auth, email, password)
    .then(() => alert("تم تسجيل الدخول!"))
    .catch(err => alert(err.message));
}