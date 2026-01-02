const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    socket.on('joinRoom', (roomName) => {
        const room = io.sockets.adapter.rooms.get(roomName);
        const numClients = room ? room.size : 0;

        if (numClients < 2) {
            socket.join(roomName);
            socket.emit('joined', { room: roomName, player: numClients + 1 });
            if (numClients === 1) io.to(roomName).emit('startGame');
        } else {
            socket.emit('full');
        }
    });

    socket.on('makeMove', (data) => {
        socket.to(data.room).emit('moveMade', data);
    });

    socket.on('gameOver', (data) => {
        socket.to(data.room).emit('gameFinished', data);
    });
});


// Remplace le port fixe 3000 par celui de Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
