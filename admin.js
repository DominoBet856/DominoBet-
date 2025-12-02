function loadAll() {
    let all = JSON.parse(localStorage.players);
    document.getElementById("all").innerText = JSON.stringify(all, null, 2);
}

loadAll();

function addBalance() {
    let id = document.getElementById("uid").value;
    let amount = Number(document.getElementById("amount").value);

    let p = get(id);
    p.balance += amount;
    save(id, p);
    loadAll();
}

function removeBalance() {
    let id = document.getElementById("uid").value;
    let amount = Number(document.getElementById("amount").value);

    let p = get(id);
    p.balance -= amount;
    if (p.balance < 0) p.balance = 0;

    save(id, p);
    loadAll();
}

function get(id) {
    let all = JSON.parse(localStorage.players);
    if (!all[id]) all[id] = { balance: 0, wins: 0, loses: 0 };
    return all[id];
}

function save(id, data) {
    let all = JSON.parse(localStorage.players);
    all[id] = data;
    localStorage.players = JSON.stringify(all);
}

function downloadBackup() {
    let data = localStorage.players;
    let blob = new Blob([data], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = "backup.json";
    a.click();
}

function restoreBackup() {
    let file = document.getElementById("restoreFile").files[0];
    let reader = new FileReader();

    reader.onload = function (e) {
        localStorage.players = e.target.result;
        loadAll();
    };

    reader.readAsText(file);
}