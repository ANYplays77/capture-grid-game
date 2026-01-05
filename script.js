const socket = io();

// --- VARIABLES GLOBALES ---
let room = null;
let myName = "Joueur";
let playerNumber = null;
let myTurn = false;
let isGameOver = false;
let score = { X: 0, O: 0 };
let myXP = parseInt(localStorage.getItem('captureXP')) || 0;

// --- SYSTÈME DE NIVEAUX ---
const RANKS = [
    { xp: 0, title: "RECRUE" },
    { xp: 300, title: "SOLDAT" },
    { xp: 800, title: "CAPITAINE" },
    { xp: 2000, title: "LÉGENDE" }
];

function updateXP() {
    // Calcul du niveau
    let currentTitle = RANKS[0].title;
    for(let r of RANKS) {
        if(myXP >= r.xp) currentTitle = r.title;
    }
    
    // Affichage
    document.getElementById('player-title').innerText = currentTitle;
    document.getElementById('xp-text').innerText = `${myXP} XP Total`;
    
    // Barre de progression (Visuel simple 0-1000 pour l'exemple)
    let percent = (myXP % 1000) / 10;
    document.getElementById('xp-bar-fill').style.width = percent + "%";
}
updateXP(); // Charger au démarrage

// --- GESTION DU SALON ---
function joinRoom() {
    const uInput = document.getElementById('usernameInput');
    const rInput = document.getElementById('roomInput');
    
    if(!uInput.value || !rInput.value) {
        alert("Entre un pseudo et un nom de salon !");
        return;
    }

    myName = uInput.value;
    room = rInput.value;
    
    socket.emit('joinRoom', { room: room, name: myName });
    
    // Feedback visuel
    document.getElementById('lobby-status').innerText = "Connexion en cours...";
    document.getElementById('lobby-status').style.color = "#00f2ff";
}

socket.on('joined', (data) => {
    playerNumber = data.player;
    document.getElementById('lobby-status').innerText = "En attente d'un adversaire...";
});

socket.on('full', () => {
    document.getElementById('lobby-status').innerText = "Ce salon est plein !";
    document.getElementById('lobby-status').style.color = "red";
});

// --- DÉMARRAGE DU JEU ---
socket.on('startGame', () => {
    // C'EST ICI QUE LA MAGIE OPÈRE : On cache le salon, on montre le jeu
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-interface').classList.remove('hidden');
    
    createGrid();
    myTurn = (playerNumber === 1);
    updateUI();
});

// --- LOGIQUE DU JEU ---
function createGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = "";
    for(let i=0; i<25; i++) {
        let cell = document.createElement('div');
        cell.className = 'cell';
        cell.onclick = () => playMove(i);
        grid.appendChild(cell);
    }
}

function playMove(i) {
    const cells = document.getElementsByClassName('cell');
    if(!myTurn || isGameOver || cells[i].innerText !== "") return;
    
    const symbol = (playerNumber === 1) ? 'X' : 'O';
    applyMove(i, symbol);
    socket.emit('makeMove', { room, index: i, symbol });
    
    myTurn = false;
    updateUI();
}

socket.on('moveMade', (data) => {
    applyMove(data.index, data.symbol);
    myTurn = true;
    updateUI();
});

function applyMove(i, symbol) {
    const cells = document.getElementsByClassName('cell');
    cells[i].innerText = symbol;
    cells[i].style.color = (symbol === 'X') ? '#ff0055' : '#00f2ff';
    cells[i].style.textShadow = `0 0 10px ${cells[i].style.color}`;
    
    checkCapture(i, symbol);
    checkWin(symbol);
}

function checkCapture(i, symbol) {
    const cells = document.getElementsByClassName('cell');
    const enemy = (symbol === 'X') ? 'O' : 'X';
    const neighbors = [i-1, i+1, i-5, i+5]; // Gauche, Droite, Haut, Bas
    
    neighbors.forEach(n => {
        if(n >= 0 && n < 25 && cells[n].innerText === enemy) {
            // Vérifier bords gauche/droite pour éviter capture à travers les lignes
            if(Math.abs((i%5) - (n%5)) > 1) return; 

            cells[n].innerText = ""; // Capture !
            score[symbol]++;
            updateScoreBoard();
        }
    });
}

function updateScoreBoard() {
    document.getElementById('p1-score').innerText = score.X;
    document.getElementById('p2-score').innerText = score.O;
}

function checkWin(symbol) {
    const cells = Array.from(document.getElementsByClassName('cell')).map(c => c.innerText);
    // Patterns : Lignes, Colonnes, Diagonales
    const wins = [
        // Lignes
        [0,1,2,3],[1,2,3,4],[5,6,7,8],[6,7,8,9],[10,11,12,13],[11,12,13,14],[15,16,17,18],[16,17,18,19],[20,21,22,23],[21,22,23,24],
        // Colonnes
        [0,5,10,15],[5,10,15,20],[1,6,11,16],[6,11,16,21],[2,7,12,17],[7,12,17,22],[3,8,13,18],[8,13,18,23],[4,9,14,19],[9,14,19,24],
        // Diagonales \
        [0,6,12,18],[1,7,13,19],[5,11,17,23],[6,12,18,24],
        // Diagonales /
        [3,7,11,15],[4,8,12,16],[8,12,16,20],[9,13,17,21]
    ];

    if(wins.some(pattern => pattern.every(idx => cells[idx] === symbol))) {
        isGameOver = true;
        document.getElementById('game-message').innerHTML = `<span style="color:gold">VICTOIRE !</span>`;
        document.getElementById('resetBtn').classList.remove('hidden');
        
        // Gain XP si c'est moi qui ai joué ce symbole
        if( (playerNumber===1 && symbol==='X') || (playerNumber===2 && symbol==='O') ) {
            myXP += 100;
            localStorage.setItem('captureXP', myXP);
            updateXP();
        }
    }
}

function updateUI() {
    if(!isGameOver) {
        const msg = document.getElementById('game-message');
        msg.innerText = myTurn ? "C'est à toi !" : "Adversaire réfléchit...";
        msg.style.color = myTurn ? "#00f2ff" : "#666";
    }
}

// --- CHAT ---
function sendMessage() {
    const input = document.getElementById('chatInput');
    if(input.value.trim()) {
        socket.emit('chatMessage', { room, user: myName, text: input.value });
        // Afficher mon propre message
        addMessageToChat("Moi", input.value, true);
        input.value = "";
    }
}

socket.on('receiveMessage', (data) => {
    addMessageToChat(data.user, data.text, false);
});

function addMessageToChat(user, text, isMe) {
    const box = document.getElementById('chat-history');
    const color = isMe ? "var(--neon-pink)" : "var(--neon-blue)";
    box.innerHTML += `<div style="margin-bottom:5px;">
        <strong style="color:${color}">${user}:</strong> ${text}
    </div>`;
    box.scrollTop = box.scrollHeight;
}
