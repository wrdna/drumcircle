let username;
let userColor;
let selectedSound = 'snare.mp3'; 
soundDir = 'sounds/';
let speedFactor = 1;
let noteDuration = 4000;
let userCount;

const historyAndBpmContainer = document.getElementById('historyAndBpmContainer');
const toggleHistoryButton = document.getElementById('toggleHistoryButton');
const usernameToggle = document.getElementById('usernameToggle');  // Username toggle checkbox

const socket = new WebSocket(`wss://${window.location.host}/berg/ws/`);


socket.onopen = () => {
    //   console.log('WebSocket connection opened');
    setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: 'ping' }));
        }
    }, 30000);  // 30 seconds
};

// socket.onmessage = (event) => {
    //   console.log('Message from server:', event.data);
    // };

// socket.onerror = (error) => {
    //   console.error('WebSocket error:', error);
    // };


function playDrum(username, color, sound) {
    const drum = document.querySelector(`.drum[data-username="${username}"]`);
    if (drum) {
        drum.style.backgroundColor = color;
        drum.style.boxShadow = '0 0 30px';
        setTimeout(() => {
            drum.classList.add('active');
            drum.style.backgroundColor = '';
            drum.style.boxShadow = '0 0 5px';
        }, 150);
        drum.classList.remove('active');
        soundPath = soundDir.concat(sound)
        audio = new Audio(soundPath);
        audio.play();
        addNoteToHistory(color, username);
    }
}

// Function to add notes to the history container
function addNoteToHistory(color, username) {
    const historyContainer = document.getElementById('historyContainer');

    // Create a new note element
    const note = document.createElement('div');
    note.classList.add('note');
    note.style.backgroundColor = color;

    if (usernameToggle.checked) {
        const noteLabel = document.createElement('span');
        noteLabel.innerText = username;
        noteLabel.style.color = '#fff';
        note.appendChild(noteLabel);
    }  
    historyContainer.appendChild(note);

    setTimeout(() => {
        historyContainer.removeChild(note);
    }, noteDuration / speedFactor);  
}

document.getElementById('soundSelector').addEventListener('change', function() {
    selectedSound = this.value;
});

// Function to toggle the history and BPM slider visibility
toggleHistoryButton.addEventListener('click', function() {
    if (historyAndBpmContainer.style.display === 'none') {
        historyAndBpmContainer.style.display = 'block';  // Show the section
        toggleHistoryButton.innerText = 'Hide History & Slider';  // Update button text
    } else {
        historyAndBpmContainer.style.display = 'none';  // Hide the section
        toggleHistoryButton.innerText = 'Show History & Slider';  // Update button text
    }
});

// Initially hide the history and slider on the loading screen
historyAndBpmContainer.style.display = 'none';  // Hidden by default
toggleHistoryButton.style.display = 'none';  // Button also hidden until user joins

function updateNoteDuration() {
    const adjustedDuration = noteDuration / speedFactor;
    document.documentElement.style.setProperty('--note-duration', `${adjustedDuration}ms`);
}

document.getElementById('bpmDial').addEventListener('input', function() {
    speedFactor = this.value;
    document.getElementById('bpmValue').innerText = `${speedFactor}x`;
    updateNoteDuration();
});

updateNoteDuration();

function userJoin(userStatus) {
    if (userStatus) {
        document.getElementById('usernameContainer').style.display = 'none';
        document.getElementById('drumCircle').style.display = 'block';
        document.getElementById('historyContainer').style.display = 'block';
        toggleHistoryButton.style.display = 'block';
    } else {
        alert('Server is full')
    }
}

// Event listener for joining the drum circle
document.getElementById('joinButton').addEventListener('click', () => {
    username = document.getElementById('usernameInput').value;
    userColor = document.getElementById('colorPicker').value;
    joinStatus = false;
    if (username && userColor) {
        socket.send(JSON.stringify({ action: 'join', username: username, color: userColor, sound: selectedSound }));
    } else {
        alert('Please enter a username and select a color!');
    }
});

let spaceKeyListenerAdded = false; // Flag to ensure we only add one keydown listener

function createDrums(userList) {
    const drumCircle = document.getElementById('drumCircle');
    drumCircle.innerHTML = '';  // Clear the previous drums

    const totalUsers = userList.length;
    const radius = totalUsers <= 6 ? totalUsers * 30 : 250;

    userList.forEach((user, index) => {
        let x, y;
        if (totalUsers === 1) {
            x = 0;
            y = 0;
        } else {
            const angle = (index / totalUsers) * 2 * Math.PI;
            x = radius * Math.cos(angle);
            y = radius * Math.sin(angle);
        }

        const drumContainer = document.createElement('div');
        drumContainer.classList.add('drum-container');

        // Position the drum in the circle
        drumContainer.style.left = `${250 + x - 75}px`;
        drumContainer.style.top = `${250 + y - 75}px`;

        // Add username label
        const usernameLabel = document.createElement('div');
        usernameLabel.innerText = user.username;
        drumContainer.appendChild(usernameLabel);

        // Create the drum element
        const drum = document.createElement('div');
        drum.classList.add('drum');
        drum.dataset.username = user.username;
        drum.dataset.color = user.color;

        drum.addEventListener('click', () => {
            if (user.username === username) {
                playDrum(username, userColor, selectedSound);
                socket.send(JSON.stringify({ 
                    action: 'play',
                    username: username,
                    color: userColor,
                    sound: selectedSound
                }));
            } else {
                alert("You can't hit other users' drums!");
            }
        });

        drumContainer.appendChild(drum);
        drumCircle.appendChild(drumContainer);
    });

    if (!spaceKeyListenerAdded) {
        document.addEventListener('keydown', (e) => {
            if (e.code === "Space" && username) {
                playDrum(username, userColor, selectedSound);
                socket.send(JSON.stringify({ 
                    action: 'play',
                    username: username,
                    color: userColor,
                    sound: selectedSound
                }));
            }
        });
        spaceKeyListenerAdded = true; 
    }
}


// Handle incoming messages from the server
socket.onmessage = function(event) {
    const message = JSON.parse(event.data);
    //console.log('Received message from server:', message);

    if (message.action === 'updateUsers') {
        createDrums(message.users);
    } else if (message.action === 'userCount') {
        userCount = message.count;
        document.getElementById('userCount').innerText = userCount;
    } else if (message.action === 'play') {
        if (message.username !== username) {
            playDrum(message.username, message.color, message.sound);
        }
    } else if (message.action === 'joinStatus') {
        userJoin(message.status); 
    }
};
