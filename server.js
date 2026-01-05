const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Un joueur est connecté');

    // ÉCOUTEUR DE CONNEXION AU SALON (Mise à jour importante)
    socket.on('joinRoom', (data) => {
        // data contient maintenant { room: "NomSalon", name: "Pseudo" }
        const roomName = data.room; 
        const playerName = data.name;

        const room = io.sockets.adapter.rooms.get(roomName);
        const numClients = room ? room.size : 0;

        if (numClients < 2) {
            socket.join(roomName);
            console.log(`${playerName} a rejoint ${roomName}`);

            // On envoie au joueur son numéro (1 ou 2)
            socket.emit('joined', { room: roomName, player: numClients + 1 });

            // Si c'est le 2ème joueur, on lance la partie pour tout le monde dans ce salon
            if (numClients === 1) {
                io.to(roomName).emit('startGame');
            }
        } else {
            // Salon plein
            socket.emit('full');
        }
    });

    // GESTION DES MOUVEMENTS
    socket.on('makeMove', (data) => {
        // On renvoie le mouvement à l'autre joueur du même salon
        socket.to(data.room).emit('moveMade', data);
    });

    // GESTION DU CHAT
    socket.on('chatMessage', (data) => {
        // On envoie le message à l'autre joueur
        socket.to(data.room).emit('receiveMessage', data);
    });

    socket.on('disconnect', () => {
        console.log('Un joueur est parti');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));
