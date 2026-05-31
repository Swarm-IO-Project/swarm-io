# AI Diary

AI tools used: ChatGPT, Claude, Gemini.

## Entry 1 - Project Structure

Question: How should I organize a browser snake game with a frontend and backend?

AI helped me separate the project into a Canvas frontend and a WebSocket backend. This made the code easier to understand because rendering, server state, and helper functions each have their own place.

## Entry 2 - Canvas Rendering

Question: How can I draw a snake game on an HTML canvas?

AI explained how to clear the canvas every frame, move the camera around the player, and draw entities like snakes, food, and the arena background in the correct order.

## Entry 3 - Player Movement

Question: How can the snake follow the mouse smoothly?

AI suggested using the mouse position to calculate a target angle, then rotating the snake toward that angle gradually. This helped the movement feel smoother instead of instantly snapping.

## Entry 4 - Snake Body Logic

Question: How do I make the snake body follow the head?

AI helped with the idea of adding a new head segment each tick and removing the last tail segment when the snake is not growing. This creates the classic snake movement effect.

## Entry 5 - Food Collection

Question: How can I detect when the snake eats food?

AI explained circle collision using distance checks between the snake head and food. If the distance is smaller than the combined radii, the food is collected and the snake grows.

## Entry 6 - Collision Detection

Question: How can I detect wall and snake collisions?

AI helped design collision checks for the arena boundary and for snake-vs-snake contact. The head position is checked against the circular arena and nearby snake segments.

## Entry 7 - Game Over Logic

Question: What should happen when the player dies?

AI suggested separating the death flow from the movement loop. When the player dies, the game shows a game over state, displays the final score, and stops normal play until restart.

## Entry 8 - Restarting The Game

Question: How can I restart the game without refreshing the page?

AI helped create a restart flow that resets the UI and asks the server for a fresh snake. This lets the player click Play Again and continue in the same browser session.

## Entry 9 - High Score

Question: How can I save the highest score in the browser?

AI recommended using `localStorage` because the high score only needs to be stored locally in the player's browser. The value is loaded on the start screen and updated after death.

## Entry 10 - WebSocket Backend

Question: Why should I use WebSocket for this game?

AI explained that WebSocket is useful because the game needs frequent real-time updates. The browser can send input to the server, and the server can send movement updates back to players.

## Entry 11 - Multiplayer Sync

Question: How can other players see newly joined or respawned snakes?

AI helped me understand that the server needs to send enough state for clients to create missing entities. A movement update alone is not enough if the client has never seen that snake before.

## Entry 12 - Bot Population

Question: How can I keep the game active when there are not many real players?

AI suggested maintaining a minimum number of active entities. If there are fewer real players, the backend fills the arena with bots so the game does not feel empty.

## Entry 13 - Bot Spawn Placement

Question: Why do bots exist on the server but not appear near the player?

AI helped find that bots were spawning randomly across a very large map. The fix was to spawn bots near real players so they are more likely to appear on screen.

## Entry 14 - Code Splitting

Question: How can I make the game code easier to read?

AI suggested moving repeated logic into utility files, such as movement helpers, collision helpers, restart helpers, and score helpers. This keeps the main game file less crowded.

## Entry 15 - Production Backend URL

Question: Why is my frontend still connecting to localhost after deploying the backend?

AI helped identify that the frontend selected `localhost` when opened locally. The server URL needed to point directly to the deployed backend IP so the browser would connect to the VPS.
