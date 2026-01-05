function checkWin(symbol) {
    const cells = Array.from(document.getElementsByClassName('cell')).map(c => c.innerText);
    const winPatterns = [];

    // Lignes (Horizontal)
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) winPatterns.push([r*5+c, r*5+c+1, r*5+c+2, r*5+c+3]);
    }
    // Colonnes (Vertical)
    for (let c = 0; c < 5; c++) {
        for (let r = 0; r < 2; r++) winPatterns.push([r*5+c, (r+1)*5+c, (r+2)*5+c, (r+3)*5+c]);
    }
    // Diagonales descendantes \
    winPatterns.push([0, 6, 12, 18], [1, 7, 13, 19], [5, 11, 17, 23], [6, 12, 18, 24]);
    // Diagonales ascendantes /
    winPatterns.push([3, 7, 11, 15], [4, 8, 12, 16], [8, 12, 16, 20], [9, 13, 17, 21]);

    if (winPatterns.some(p => p.every(idx => cells[idx] === symbol))) {
        // Logique de victoire...
        isGameOver = true;
        totalWins[symbol]++;
        localStorage.setItem('captureGridWins', JSON.stringify(totalWins));
        document.getElementById('game-status').innerHTML = `VICTOIRE DE ${symbol} !`;
        document.getElementById('resetBtn').classList.remove('hidden');
    }
}
// ... (Initialisation Socket.io) ...

let myXP = parseInt(localStorage.getItem('captureGridXP')) || 0;

function updateRankDisplay() {
    const level = Math.floor(myXP / 500) + 1; // Un niveau tous les 500 XP
    const nextLevelXP = level * 500;
    document.getElementById('player-rank').innerText = `Niveau ${level} (${myXP} / ${nextLevelXP} XP)`;
}

// Appeler au chargement
updateRankDisplay();

// Dans la fonction checkWin(symbol) :
if (winPatterns.some(p => p.every(idx => cells[idx] === symbol))) {
    isGameOver = true;
    
    // Si c'est moi qui gagne (Vérification simple)
    const mySymbol = (playerNumber === 1) ? 'X' : 'O';
    if (symbol === mySymbol) {
        myXP += 100; // +100 XP par victoire
        localStorage.setItem('captureGridXP', myXP);
        updateRankDisplay();
    }
    
    // ... reste de la logique de victoire (Sons, Reset, etc.)
}

// AJOUT DES DIAGONALES DANS winPatterns
function getWinPatterns() {
    let patterns = [];
    // Horizontales & Verticales (déjà fait)
    // ...
    // Diagonales \
    patterns.push([0, 6, 12, 18], [1, 7, 13, 19], [5, 11, 17, 23], [6, 12, 18, 24]);
    // Diagonales /
    patterns.push([3, 7, 11, 15], [4, 8, 12, 16], [8, 12, 16, 20], [9, 13, 17, 21]);
    return patterns;
}
