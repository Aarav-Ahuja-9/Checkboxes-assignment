require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "fallback_password"; 
const TOTAL_BOXES = 1000000;
// 1,000,000 bits = 125,000 bytes
const checkboxState = Buffer.alloc(Math.ceil(TOTAL_BOXES / 8), 0);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.emit('full_state', checkboxState);

    socket.on('toggle', (data) => {
        const { index, checked } = data;
        if (index < 0 || index >= TOTAL_BOXES) return;

        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;

        if (checked) {
            checkboxState[byteIndex] |= (1 << bitIndex);
        } else {
            checkboxState[byteIndex] &= ~(1 << bitIndex);
        }

        socket.broadcast.emit('update', { index, checked });
    });

    socket.on('reset_all', (data) => {
        if (data.password === ADMIN_PASSWORD) {
            checkboxState.fill(0);
            io.emit('full_state', checkboxState);
            console.log("Board cleared by admin");
        } else {
            socket.emit('error_message', "Wrong password!");
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});