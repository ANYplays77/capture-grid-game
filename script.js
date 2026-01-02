const socket = io();
let room = null, playerNumber = null, myTurn = false, isGameOver = false;
let scores = { X: 0, O: 0 };

const statusElement = document.getElementById('game-status');
const gridElement = document.getElementById('grid');
const resetBtn = document.getElementById('resetBtn');

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
    statusElement.innerText = "En attente d'un adversaire...";
    // On s'assure que le bouton rejouer est caché quand on attend
    resetBtn.classList.add('hidden');
});

socket.on('startGame', () => {
    isGameOver = false;
    gridElement.classList.remove('hidden');
    document.getElementById('score-board').classList.remove('hidden');
    createGrid();
    myTurn = (playerNumber === 1);
    updateUI();
});

function createGrid() {
    gridElement.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.onclick = () => makeMove(i);
        gridElement.appendChild(cell);
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
        }
    });
}

function checkWin(symbol) {
    const cells = Array.from(document.getElementsByClassName('cell')).map(c => c.innerText);
    const winPatterns = [];
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) winPatterns.push([r*5+c, r*5+c+1, r*5+c+2, r*5+c+3]);
    }
    for (let c = 0; c < 5; c++) {
        for (let r = 0; r < 2; r++) winPatterns.push([r*5+c, (r+1)*5+c, (r+2)*5+c, (r+3)*5+c]);
    }

    if (winPatterns.some(p => p.every(idx => cells[idx] === symbol))) {
        isGameOver = true;
        statusElement.innerHTML = `<span style="color:gold; font-size:1.5rem;">VICTOIRE DE ${symbol} !</span>`;
        // Le bouton "REJOUER" n'apparaît qu'ici
        resetBtn.classList.remove('hidden');
    }
}

function updateUI() {
    if (!isGameOver) {
        statusElement.innerText = myTurn ? "À VOUS DE JOUER !" : "ATTENTE DE L'ADVERSAIRE...";
        statusElement.style.color = myTurn ? "#00f2ff" : "#666";
    }
}