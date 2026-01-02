const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    // Rejoindre un salon
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

    // Transmettre un coup
    socket.on('makeMove', (data) => {
        socket.to(data.room).emit('moveMade', data);
    });

    // Transmettre un message de chat
    socket.on('chatMessage', (data) => {
        socket.to(data.room).emit('receiveMessage', data);
    });

    socket.on('gameOver', (data) => {
        socket.to(data.room).emit('gameFinished', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));
