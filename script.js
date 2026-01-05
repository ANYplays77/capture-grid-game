const socket = io();
let room = null, playerNumber = null, myTurn = false, isGameOver = false;
let currentMatchScore = { X: 0, O: 0 };

// Sauvegarde des victoires totales (Historique)
let totalWins = JSON.parse(localStorage.getItem('captureGridWins')) || { X: 0, O: 0 };

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

function joinRoom() {
    const input = document.getElementById('roomInput');
    if (input.value) { room = input.value; socket.emit('joinRoom', room); }
}

socket.on('joined', (data) => {
    playerNumber = data.player;
    document.getElementById('lobby-menu').classList.add('hidden');
    document.getElementById('game-status').innerText = "EN ATTENTE D'UN RIVAL...";
    updateStatsUI();
});

socket.on('startGame', () => {
    isGameOver = false;
    document.getElementById('grid').classList.remove('hidden');
    document.getElementById('score-board').classList.remove('hidden');
    document.getElementById('chat-container').classList.remove('hidden');
    createGrid(); myTurn = (playerNumber === 1); updateUI();
});

function createGrid() {
    const grid = document.getElementById('grid'); grid.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell'); cell.onclick = () => makeMove(i);
        grid.appendChild(cell);
    }
}

function makeMove(index) {
    const cells = document.getElementsByClassName('cell');
    if (!myTurn || isGameOver || cells[index].innerText !== "") return;
    const symbol = (playerNumber === 1) ? 'X' : 'O';
    applyMove(index, symbol);
    socket.emit('makeMove', { room, index, symbol });
    myTurn = false; updateUI();
}

socket.on('moveMade', (data) => { applyMove(data.index, data.symbol); myTurn = true; updateUI(); });

function applyMove(index, symbol) {
    const cells = document.getElementsByClassName('cell');
    const cell = cells[index];
    cell.innerText = symbol;
    cell.style.color = (symbol === 'X') ? 'var(--playerX)' : 'var(--playerO)';
    cell.style.textShadow = `0 0 15px ${cell.style.color}`;
    playTone(symbol === 'X' ? 400 : 600, 'sine', 0.1);
    
    checkCapture(index, symbol);
    checkWin(symbol);
}

function checkCapture(index, symbol) {
    const cells = document.getElementsByClassName('cell');
    const enemy = (symbol === 'X') ? 'O' : 'X';
    const adjacents = [index - 5, index + 5, index - 1, index + 1];

    adjacents.forEach(adj => {
        if (adj >= 0 && adj < 25 && cells[adj].innerText === enemy) {
            cells[adj].classList.add('captured');
            setTimeout(() => {
                cells[adj].innerText = ""; 
                cells[adj].classList.remove('captured');
            }, 500);
            currentMatchScore[symbol]++;
            updateStatsUI();
            playTone(100, 'sawtooth', 0.2);
        }
    });
}

function checkWin(symbol) {
    const cells = Array.from(document.getElementsByClassName('cell')).map(c => c.innerText);
    const winPatterns = [];

    // Lignes & Colonnes
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) {
            winPatterns.push([r*5+c, r*5+c+1, r*5+c+2, r*5+c+3]); // H
            winPatterns.push([c*5+r, (c+1)*5+r, (c+2)*5+r, (c+3)*5+r]); // V
        }
    }
    // Diagonales (\)
    const diag1 = [[0,6,12,18], [1,7,13,19], [5,11,17,23], [6,12,18,24]];
    // Diagonales (/)
    const diag2 = [[3,7,11,15], [4,8,12,16], [8,12,16,20], [9,13,17,21]];
    
    const allPatterns = [...winPatterns, ...diag1, ...diag2];

    if (allPatterns.some(p => p.every(idx => cells[idx] === symbol))) {
        isGameOver = true;
        totalWins[symbol]++;
        localStorage.setItem('captureGridWins', JSON.stringify(totalWins));
        document.getElementById('game-status').innerHTML = `<span style="color:var(--accent)">VICTOIRE DE ${symbol} !</span>`;
        document.getElementById('resetBtn').classList.remove('hidden');
        updateStatsUI();
        playWinSound();
    }
}

function updateStatsUI() {
    document.getElementById('p1-label').innerText = `X: ${currentMatchScore.X} (Total: ${totalWins.X})`;
    document.getElementById('p2-label').innerText = `O: ${currentMatchScore.O} (Total: ${totalWins.O})`;
}

function updateUI() {
    if (!isGameOver) {
        const st = document.getElementById('game-status');
        st.innerText = myTurn ? "À TOI DE JOUER !" : "L'ADVERSAIRE RÉFLÉCHIT...";
        st.style.color = myTurn ? "var(--playerO)" : "#555";
    }
}

function playWinSound() {
    [523, 659, 783, 1046].forEach((f, i) => {
        setTimeout(() => playTone(f, 'square', 0.3), i * 150);
    });
}

// CHAT
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
    msgArea.innerHTML += `<div><b style="color:var(--accent)">${data.user}:</b> ${data.text}</div>`;
    msgArea.scrollTop = msgArea.scrollHeight;
}
