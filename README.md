# Swarm IO

Swarm IO is a browser snake game inspired by Slither.io. The player controls a snake, collects food, grows longer, avoids walls and other snakes, and tries to beat the saved high score.

The game has a Canvas frontend and a Node.js WebSocket backend. The backend keeps the arena alive with bots, so there are always enough moving entities even when only one real player is online.

## Game Description

You start as a small snake in a large arena. Food dots are scattered around the map. Eating food increases your length and score. Other snakes, including bots and real players, move around the same arena. If your head hits a wall or another snake, the game ends and your final length is shown.

## Entities

- Player snake: controlled by the mouse.
- Bot snakes: server-controlled snakes that keep the arena populated.
- Food: collectible dots that make snakes grow.
- Arena boundary: circular wall around the map.
- Leaderboard: shows the strongest snakes by length.
- Start screen: nickname input and play button.
- Game over screen: final score and restart flow.

## Excalidraw Sketch

```text
+------------------------------------------------------+
|                    SWARM IO ARENA                    |
|                                                      |
|       food *        bot snake ~~~~~                  |
|                                                      |
|              player snake =======>                   |
|                                                      |
|   bot snake ~~~~             food *      food *      |
|                                                      |
|      circular arena boundary / collision zone        |
+------------------------------------------------------+

Lobby -> Play -> Game Loop -> Collision Check
                         |-> Eat Food -> Grow + Score
                         |-> Death -> Game Over -> Restart
```

## How To Play

1. Open the game page.
2. Enter a nickname.
3. Click Play.
4. Move the mouse to steer the snake.
5. Eat food to grow longer.
6. Avoid the arena wall and other snakes.
7. After dying, click Play Again to restart without refreshing the page.

Objective: grow as long as possible and beat your high score.

Lose condition: the snake dies when its head collides with the wall or another snake.

## Tech Decisions

The project uses object-oriented code on the backend because snakes and bots have state and behavior that fit naturally into classes. `Snake` owns movement, growth, boost state, and radius logic. `Bot` extends `Snake` and adds AI movement decisions.

The frontend is mostly functional with a `Renderer` class. The renderer owns Canvas drawing, while helper modules handle movement, collision, restart, start screens, and score persistence. This keeps the main `game.js` file readable while still making rendering state easy to manage.

WebSocket is used because the game needs frequent real-time updates between the server and browser clients.

## Links

- AI Diary: [AI_DIARY.md](./AI_DIARY.md)
- GitHub Pages: [Swarm IO](https://swarm-io-project.github.io/swarm-io/)

## Known Bugs / What I Would Fix Next

- Add HTTPS/WSS support for production so the WebSocket works from secure hosted pages.
- Improve bot AI so bots chase food and react more naturally to players.
- Move food ownership fully to the server for better multiplayer consistency.
- Add a real exported Excalidraw image instead of the text sketch above.
- Add mobile/touch controls.
- Add automated tests for server population, respawn, and collision behavior.

## Run Locally

Start the backend:

```bash
cd backend
npm install
npm start
```

Serve the frontend:

```bash
cd frontend
python -m http.server 4173
```

Then open:

```text
http://localhost:4173
```
