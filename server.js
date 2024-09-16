const express = require('express');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = 3000;
const DEBUG = false;
const MAX_CONNECTED_USERS = 12;

// serving static files 
app.use('/berg/drumcircle', express.static(path.join(__dirname, 'public')));

// catch-all route for single page application
app.get('/berg/drumcircle/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
    if (DEBUG) {
        console.log(`Server is running on http://localhost:${PORT}`);
    }
});

const wss = new WebSocket.Server({ server });

let users = [];

function broadcastUserList() {
    const userList = users.map(user => ({
        username: user.username,
        color: user.color,
        sound: user.sound
    }));
    users.forEach(user => {
        if (user.connection.readyState === WebSocket.OPEN) {
            user.connection.send(JSON.stringify({ action: 'updateUsers', users: userList }));
        }
    });
}

function broadcastUserCount() {
    const userCount = users.length;
    const message = JSON.stringify({ action: 'userCount', count: userCount });
    users.forEach(user => {
        if (user.connection.readyState === WebSocket.OPEN) {
            user.connection.send(message);
        }
    });
}

function sendUserCountToClient(ws) {
    const userCount = users.length;
    ws.send(JSON.stringify({ action: 'userCount', count: userCount }));
}

function sendJoinStatusToClient(ws, joinStatus) {
    ws.send(JSON.stringify({ action: 'joinStatus', status: joinStatus}));
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
    sendUserCountToClient(ws);
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const userCount = users.length;
        if (DEBUG) {
            console.log('Received message from client:', data);
        }

        if (data.action === 'join') {
            if (userCount < MAX_CONNECTED_USERS) {
                const newUser = { username: data.username, color: data.color, sound: data.sound, connection: ws };
                users.push(newUser);
                broadcastUserList();  
                broadcastUserCount();
                joinStatus = true;
            } else {
                joinStatus = false;
            }
            sendJoinStatusToClient(ws, joinStatus);
            if (DEBUG) {
                console.log('New user joined:', newUser);
            }
        }
        if (data.action === 'play') {
            users.forEach(user => {
                if (user.connection.readyState === WebSocket.OPEN) {
                    user.connection.send(JSON.stringify({
                        action: 'play',
                        username: data.username,
                        color: data.color,
                        sound: data.sound
                    }));
                }
            });

            if (DEBUG) {
                console.log(`User ${data.username} played a drum with color ${data.color}`);
            }
        }
        if (data.action === 'ping') {
            ws.send(JSON.stringify({ action: 'pong' }));  // Respond with pong
        }
    });

    // Handle user disconnection
    ws.on('close', () => {
        users = users.filter(user => user.connection !== ws);
        broadcastUserList();  
        broadcastUserCount();
        if (DEBUG) {
            console.log('User disconnected, remaining users:', users);
        }
    });

    // Error handling for WebSocket connections
    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });
});

// Handle any HTTP server-level errors
server.on('error', (err) => {
    console.error('HTTP server error:', err);
});

