let username;
let userColor;
const socket = new WebSocket('ws://localhost:3000');

// Flag to prevent multiple keydown event listeners
let keydownListenerAdded = false;

// Function to play sound and light effect on a drum
function playDrum(username, color) {
  const drum = document.querySelector(`.drum[data-username="${username}"]`);
  if (drum) {
    drum.style.backgroundColor = color;  // Apply the selected color to the drum
    drum.classList.add('active');
    setTimeout(() => {
      drum.classList.remove('active');
      drum.style.backgroundColor = '';  // Reset drum color after hit
    }, 300);

    // Play drum sound (use any sound file)
    const audio = new Audio('drum-sound.mp3');
    audio.play();
  }
}

// Event listener for joining the drum circle
document.getElementById('joinButton').addEventListener('click', () => {
  username = document.getElementById('usernameInput').value;
  userColor = document.getElementById('colorPicker').value;

  if (username && userColor) {
    // Hide the username input and show the drum circle
    document.getElementById('usernameContainer').style.display = 'none';
    document.getElementById('drumCircle').style.display = 'block';

    // Send the username and color to the server
    console.log('Sending join message to server:', { username, userColor });
    socket.send(JSON.stringify({ action: 'join', username: username, color: userColor }));
  } else {
    alert('Please enter a username and select a color!');
  }
});

// Dynamically create drums based on the list of connected users
function createDrums(userList) {
  const drumCircle = document.getElementById('drumCircle');
  drumCircle.innerHTML = '';  // Clear any existing drums

  const drums = {};  // Store drums for reference

  userList.forEach((user) => {
    const drumContainer = document.createElement('div');
    drumContainer.classList.add('drum-container');

    // Create an element to display the username above the drum
    const usernameLabel = document.createElement('div');
    usernameLabel.innerText = user.username;
    drumContainer.appendChild(usernameLabel);

    // Create the drum element
    const drum = document.createElement('div');
    drum.classList.add('drum');
    drum.dataset.username = user.username;  // Associate the drum with the username
    drum.dataset.color = user.color;  // Store the user's chosen color in the dataset

    // Store drum element for later reference
    drums[user.username] = drum;

    // Add click event listener to play the drum
    // Remove any existing listeners to avoid duplicates
    drum.replaceWith(drum.cloneNode(true));  // Replace the drum with a fresh clone to avoid duplicate listeners
    drum.addEventListener('click', () => {
      if (user.username === username) {
        playDrum(username, userColor);  // Use the selected color of the current user
        socket.send(JSON.stringify({ action: 'play', username: username, color: userColor }));
      } else {
        alert("You can't hit other users' drums!");
      }
    });

    drumContainer.appendChild(drum);
    drumCircle.appendChild(drumContainer);
  });

  // Add a global keydown event listener to handle the spacebar, but only once
  if (!keydownListenerAdded) {
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();  // Prevent default spacebar behavior (scrolling)

        const drum = drums[username];
        if (drum) {
          playDrum(username, userColor);  // Use the user's chosen color
          socket.send(JSON.stringify({ action: 'play', username: username, color: userColor }));
        }
      }
    });
    keydownListenerAdded = true;  // Ensure the listener is only added once
  }
}

// Handle incoming messages from the server
socket.onmessage = function(event) {
  const message = JSON.parse(event.data);
  console.log('Received message from server:', message);

  if (message.action === 'updateUsers') {
    // Update the number of drums based on the list of users
    createDrums(message.users);
  } else if (message.action === 'play') {
    // Play the drum when another user hits it, using their chosen color
    playDrum(message.username, message.color);
  }
};
