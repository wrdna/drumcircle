const express = require('express');
const path = require('path');
const WebSocket = require('ws');

// Create an Express app
const app = express();
const PORT = 3000;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Start the HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// WebSocket server setup
const wss = new WebSocket.Server({ server });  // Attach WebSocket server to the Express HTTP server

let users = [];  // Track connected users

// Function to broadcast an updated list of users
function broadcastUserList() {
  const userList = users.map(user => ({ username: user.username, color: user.color }));
  users.forEach(user => {
    if (user.connection.readyState === WebSocket.OPEN) {
      user.connection.send(JSON.stringify({ action: 'updateUsers', users: userList }));
    }
  });
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Received message from client:', data);

    // When a user joins
    if (data.action === 'join') {
      const newUser = { username: data.username, color: data.color, connection: ws };
      users.push(newUser);
      console.log('New user joined:', newUser);
      broadcastUserList();  // Send updated user list to all clients
    }

    // When a user hits a drum
    if (data.action === 'play') {
      console.log(`User ${data.username} played a drum with color ${data.color}`);
      users.forEach(user => {
        if (user.connection.readyState === WebSocket.OPEN) {
          user.connection.send(JSON.stringify({ action: 'play', username: data.username, color: data.color }));
        }
      });
    }
  });

  // When a user disconnects
  ws.on('close', () => {
    users = users.filter(user => user.connection !== ws); // Remove the user
    console.log('User disconnected, remaining users:', users);
    broadcastUserList();  // Send updated user list
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
