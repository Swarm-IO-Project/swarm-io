# AI Diary

AI tools used: ChatGPT, Claude, Gemini.

### 2026-05-27 02:22 - Project folders were too unclear

**What I asked the AI:** How should I organize a browser snake game with frontend and backend code?
**What it gave me:** A simple split with `frontend/`, `backend/`, and helper files.
**What was wrong:** The first suggestion was too general and did not explain which logic should live in each folder.
**How I fixed it:** I separated rendering into the frontend, WebSocket/game state into the backend, and shared-style helper logic into `utils` folders.
**Time lost:** ~8 minutes

### 2026-05-27 02:42 - HTML loaded before the game was ready

**What I asked the AI:** Why is my browser game not starting correctly from the HTML file?
**What it gave me:** A basic HTML structure with a script tag.
**What was wrong:** The answer did not mention that module imports need `type="module"`.
**How I fixed it:** I loaded the frontend game file as a module so utility imports worked correctly.
**Time lost:** ~6 minutes

### 2026-05-27 02:56 - Snake movement felt too sharp

**What I asked the AI:** How can I make the snake follow the mouse smoothly?
**What it gave me:** Directly set the snake angle to the mouse angle.
**What was wrong:** The movement snapped instantly and did not feel like a snake.
**How I fixed it:** I added `targetAngle` and used gradual rotation with `rotateToward`.
**Time lost:** ~10 minutes

### 2026-05-27 03:12 - Snake body did not follow naturally

**What I asked the AI:** How do I make the snake body follow the head?
**What it gave me:** A simple idea of moving every body segment manually.
**What was wrong:** Moving every segment independently looked messy and caused spacing problems.
**How I fixed it:** I inserted a new head segment each tick and removed the tail segment when the snake was not growing.
**Time lost:** ~7 minutes

### 2026-05-27 03:26 - Food collision was unreliable

**What I asked the AI:** How can I detect when the snake eats food?
**What it gave me:** A basic distance check between the snake head and food.
**What was wrong:** The first check ignored the actual radius of food and snake size.
**How I fixed it:** I compared squared distance with the combined radii of the snake head and food.
**Time lost:** ~9 minutes

### 2026-05-27 03:40 - Wall collision ended the game too early

**What I asked the AI:** How can I detect if the snake hits the arena wall?
**What it gave me:** A rectangle boundary check using map width and height.
**What was wrong:** My arena is circular, so rectangle collision did not match the visible map.
**How I fixed it:** I changed the wall check to use distance from the arena center and subtract the snake radius.
**Time lost:** ~8 minutes

### 2026-05-27 03:51 - Game over state mixed with movement code

**What I asked the AI:** What should happen when the player dies?
**What it gave me:** Put the death UI update directly inside movement logic.
**What was wrong:** This made movement, scoring, and UI logic too tangled.
**How I fixed it:** I created a separate `endGame` flow that updates final score, high score, and screen state.
**Time lost:** ~6 minutes

### 2026-05-27 04:04 - Score did not update consistently

**What I asked the AI:** How should I calculate the player's score?
**What it gave me:** Store a separate score number.
**What was wrong:** The score could get out of sync with the actual snake length.
**How I fixed it:** I used the snake segment length as the main score source.
**Time lost:** ~5 minutes

### 2026-05-28 10:07 - Start screen and canvas overlapped

**What I asked the AI:** How can I switch between lobby and gameplay screens?
**What it gave me:** Toggle a hidden class on the lobby.
**What was wrong:** The canvas still stayed visible in some states.
**How I fixed it:** I added screen helper functions to show the lobby, show the game, and hide/show the canvas correctly.
**Time lost:** ~9 minutes

### 2026-05-28 10:23 - Game over screen needed the final score

**What I asked the AI:** How do I show the final score after death?
**What it gave me:** A separate death screen idea.
**What was wrong:** It did not match my combined lobby/game-over UI.
**How I fixed it:** I reused the lobby screen and added a game-over score section that appears only after death.
**Time lost:** ~7 minutes

### 2026-05-28 11:32 - Restart created stale state

**What I asked the AI:** How can I restart without refreshing the page?
**What it gave me:** Reset only the button text and start movement again.
**What was wrong:** Old snake and food state could remain from the previous round.
**How I fixed it:** I reset UI state and asked the server/local fallback to create a fresh snake.
**Time lost:** ~10 minutes

### 2026-05-28 11:48 - Respawn was not visible to other players

**What I asked the AI:** Why can I respawn but my friend does not see me?
**What it gave me:** Only send movement updates after respawn.
**What was wrong:** Other clients did not have the new snake snapshot yet.
**How I fixed it:** I made the server send enough sync data so clients can create missing snakes.
**Time lost:** ~9 minutes

### 2026-05-29 14:12 - High score reset after refresh

**What I asked the AI:** How can I keep the high score after closing the page?
**What it gave me:** Store the score in a JavaScript variable.
**What was wrong:** A normal variable disappears when the page reloads.
**How I fixed it:** I used `localStorage` to save and load the high score in the browser.
**Time lost:** ~6 minutes

### 2026-05-31 22:25 - WebSocket worked locally but failed on HTTPS

**What I asked the AI:** Why does the multiplayer backend fail from the hosted frontend?
**What it gave me:** Use the deployed backend URL in the frontend.
**What was wrong:** The page was loaded over HTTPS, so insecure `ws://` connections were blocked by the browser.
**How I fixed it:** I switched the frontend to use `wss://` for the deployed backend and kept local fallback behavior for failed connections.
**Time lost:** ~10 minutes

### 2026-05-31 23:05 - Bots existed but did not appear near the player

**What I asked the AI:** Why are bots not visible even though the server creates them?
**What it gave me:** Keep a fixed number of bots in the room.
**What was wrong:** The map was very large, so bots spawned far away from the player.
**How I fixed it:** I changed bot spawning so bots are generated near real players and replaced when they die.
**Time lost:** ~8 minutes
