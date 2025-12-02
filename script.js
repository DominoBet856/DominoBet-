// ---------------- Local Database --------------------

if (!localStorage.players) localStorage.players = JSON.stringify({});

// قراءة لاعب
function getPlayer(id) {
    let all = JSON.parse(localStorage.players);
    if (!all[id]) {
        all[id] = { balance: 0, wins: 0, loses: 0 };
        localStorage.players = JSON.stringify(all);
    }
    return all[id];
}

// حفظ لاعب
function savePlayer(id, data) {
    let all = JSON.parse(localStorage.players);
    all[id] = data;
    localStorage.players = JSON.stringify(all);
}

// ---------------- Game Logic --------------------

function startMatch() {
    let p1 = document.getElementById("p1").value;
    let p2 = document.getElementById("p2").value;
    let amount = Number(document.getElementById("amount").value);

    if (!p1 || !p2) return alert("اكتب أرقام اللاعبين");

    let a = getPlayer(p1);
    let b = getPlayer(p2);

    if (a.balance < amount || b.balance < amount) {
        return alert("رصيد غير كافي");
    }

    // خصم المبلغ
    a.balance -= amount;
    b.balance -= amount;

    // إجمالي المبلغ + نسبة النظام
    let pot = amount * 2;
    let systemCut = pot * 0.25;
    let prize = pot - systemCut;

    // اختيار فائز عشوائي
    let winner = Math.random() > 0.5 ? p1 : p2;

    if (winner === p1) {
        a.balance += prize;
        a.wins++;
        b.loses++;
    } else {
        b.balance += prize;
        b.wins++;
        a.loses++;
    }

    savePlayer(p1, a);
    savePlayer(p2, b);

    document.getElementById("result").innerHTML =
        "الفائز هو: <b>" + winner + "</b><br>الربح: " + prize + " جنيه";
}

// ---------------- Hidden Admin Button --------------------

let counter = 0;
document.getElementById("about").onclick = function () {
    counter++;
    if (counter === 5) {
        let pass = prompt("ادخل كود الادمن:");
        if (pass === "12345") { 
            window.location.href = "admin.html";
        } else {
            alert("رمز خاطئ");
        }
        counter = 0;
    }
};