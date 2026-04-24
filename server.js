require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONFIGURATION ---
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "fallback_password"; 
const TOTAL_BOXES = 1000000;
// 1,000,000 bits = 125,000 bytes
const checkboxState = Buffer.alloc(Math.ceil(TOTAL_BOXES / 8), 0);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send the current 1 million checkbox states to the new user
    socket.emit('full_state', checkboxState);

    // Handle Checkbox Toggles
    socket.on('toggle', (data) => {
        const { index, checked, username } = data; // Now receiving username
        
        if (index < 0 || index >= TOTAL_BOXES) return;

        const byteIndex = Math.floor(index / 8);
        const bitIndex = index % 8;

        // Update the bit in the Buffer
        if (checked) {
            checkboxState[byteIndex] |= (1 << bitIndex);
        } else {
            checkboxState[byteIndex] &= ~(1 << bitIndex);
        }

        // We use io.emit so EVERYONE (including the sender) 
        // receives the update and sees the floating name
        io.emit('update', { 
            index, 
            checked, 
            username: username || "Anonymous" 
        });
    });

    // Handle Admin Reset
    socket.on('reset_all', (data) => {
        if (data.password === ADMIN_PASSWORD) {
            checkboxState.fill(0);
            io.emit('full_state', checkboxState);
            console.log("Board cleared by admin");
        } else {
            socket.emit('error_message', "Wrong password!");
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});