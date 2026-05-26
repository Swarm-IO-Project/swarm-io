# Swarm IO

Swarm IO is a simple browser snake game inspired by Slither.io.  
The player controls a snake, collects food, grows longer, avoids collisions, and tries to get a higher score.

## Features

- Player movement with mouse control
- Collectible food
- Collision / lose condition
- Score and high score
- Start screen
- Game over screen
- Restart without refreshing the page
- Basic multiplayer backend with WebSocket
- Bot snakes in the arena

## Project Structure

```text
Swarm-IO/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── utils/
│      
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── game.js
│   └── utils/
│      
│
└── README.md