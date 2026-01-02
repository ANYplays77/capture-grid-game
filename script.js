const socket = io();
let room = null, playerNumber = null, myTurn = false, isGameOver = false;
let scores = { X: 0, O: 0 };

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

function joinRoom() {
    const input = document.getElementById('roomInput');
    if (input.value) {
        room = input.value;
        socket.emit('joinRoom', room);
    }
}

socket.on('joined', (data) => {
    playerNumber = data.player;
    document.getElementById('lobby-menu').classList.add('hidden');
    document.getElementById('game-status').innerText = "Attente d'un adversaire...";
});

socket.on('startGame', () => {
    isGameOver = false;
    document.getElementById('grid').classList.remove('hidden');
    document.getElementById('score-board').classList.remove('hidden');
    document.getElementById('chat-container').classList.remove('hidden');
    createGrid();
    myTurn = (playerNumber === 1);
    updateUI();
});

function createGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.onclick = () => makeMove(i);
        grid.appendChild(cell);
    }
}

function makeMove(index) {
    const cells = document.getElementsByClassName('cell');
    if (!myTurn || isGameOver || cells[index].innerText !== "") return;
    const symbol = (playerNumber === 1) ? 'X' : 'O';
    applyMove(index, symbol);
    socket.emit('makeMove', { room, index, symbol });
    myTurn = false;
    updateUI();
}

socket.on('moveMade', (data) => {
    applyMove(data.index, data.symbol);
    myTurn = true;
    updateUI();
});

function applyMove(index, symbol) {
    const cells = document.getElementsByClassName('cell');
    const cell = cells[index];
    cell.innerText = symbol;
    cell.style.color = (symbol === 'X') ? '#ff0055' : '#00f2ff';
    cell.style.textShadow = `0 0 15px ${cell.style.color}`;
    playTone(symbol === 'X' ? 440 : 520, 'sine', 0.1);
    checkCapture(index, symbol);
    checkWin(symbol);
}

function checkCapture(index, symbol) {
    const cells = document.getElementsByClassName('cell');
    const enemy = (symbol === 'X') ? 'O' : 'X';
    const adjacents = [index - 5, index + 5, index - 1, index + 1];
    adjacents.forEach(adj => {
        if (adj >= 0 && adj < 25 && cells[adj].innerText === enemy) {
            cells[adj].innerText = ""; 
            scores[symbol]++;
            document.getElementById('p1-label').innerText = `X: ${scores.X}`;
            document.getElementById('p2-label').innerText = `O: ${scores.O}`;
            playTone(150, 'sawtooth', 0.2);
        }
    });
}

function checkWin(symbol) {
    const cells = Array.from(document.getElementsByClassName('cell')).map(c => c.innerText);
    const winPatterns = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) winPatterns.push([r*5+c, r*5+c+1, r*5+c+2, r*5+c+3]);
    for (let c = 0; c < 5; c++) for (let r = 0; r < 2; r++) winPatterns.push([r*5+c, (r+1)*5+c, (r+2)*5+c, (r+3)*5+c]);

    if (winPatterns.some(p => p.every(idx => cells[idx] === symbol))) {
        isGameOver = true;
        document.getElementById('game-status').innerHTML = `<span style="color:gold">VICTOIRE DE ${symbol} !</span>`;
        document.getElementById('resetBtn').classList.remove('hidden');
        setTimeout(() => playTone(523, 'square', 0.2), 0);
        setTimeout(() => playTone(659, 'square', 0.2), 150);
        setTimeout(() => playTone(783, 'square', 0.4), 300);
    }
}

function updateUI() {
    if (!isGameOver) {
        document.getElementById('game-status').innerText = myTurn ? "À VOUS !" : "ATTENTE...";
        document.getElementById('game-status').style.color = myTurn ? "#00f2ff" : "#666";
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    if (input.value.trim() && room) {
        const data = { room, user: (playerNumber === 1 ? "X" : "O"), text: input.value };
        socket.emit('chatMessage', data);
        displayMessage(data);
        input.value = "";
    }
}

socket.on('receiveMessage', (data) => displayMessage(data));

function displayMessage(data) {
    const msgArea = document.getElementById('chat-messages');
    msgArea.innerHTML += `<div><b>${data.user}:</b> ${data.text}</div>`;
    msgArea.scrollTop = msgArea.scrollHeight;
}
