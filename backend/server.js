const http = require('http');
const WebSocket = require('ws');
const {
  MAP_SIZE,
  ARENA_CENTER,
  ARENA_RADIUS,
  CELL_SIZE,
  PLAYER_TURN_STEP,
  THEMES
} = require('./utils/gameConfig');
const {
  handlePlayerMovementRandomArenaPoint,
  handlePlayerMovementRotateToward: rotateToward
} = require('./utils/playerMovement');
const {
  handleCollisionInteractionIsInsideArena,
  handleCollisionInteractionCellKey
} = require('./utils/collisionInteraction');
const {
  handleScoreLoseCleanName: cleanName
} = require('./utils/scoreLose');
const {
  handleGameRestartBuildSnake
} = require('./utils/gameRestart');

const PORT = process.env.PORT || 3000;
const TICK_MS = 60;
const MIN_ACTIVE_PLAYERS = 10;

function randomArenaPoint(padding) {
  return handlePlayerMovementRandomArenaPoint(ARENA_CENTER, ARENA_RADIUS, padding);
}

function isInsideArena(x, y, padding) {
  return handleCollisionInteractionIsInsideArena(ARENA_CENTER, ARENA_RADIUS, x, y, padding);
}

function cellKey(x, y) {
  return handleCollisionInteractionCellKey(CELL_SIZE, x, y);
}

class Snake {
  constructor(id, name, x, y, color, theme) {
    this.id = id;
    this.name = name;
    this.segments = [];
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.speed = 120.0;
    this.color = color;
    this.alive = true;
    this.score = 12;
    this.grow = 0;
    this.boost = false;
    this.boostCounter = 0;
    this.theme = theme || 'classic';
    for (let i = 0; i < 12; i++) this.segments.push({ x: x - i * 8, y });
  }

  radius() {
    return 10 + Math.min(this.segments.length / 35, 1) * 12;
  }

  move() {
    if (!this.alive) return null;
    
    // Set speed based on boost
    const canBoost = this.boost && this.segments.length > 12;
    if (canBoost) {
      this.speed = 40.0;
    } else {
      this.speed = 20.0;
    }

    this.angle = rotateToward(this.angle, this.targetAngle, PLAYER_TURN_STEP);

    const head = this.segments[0];
    const next = { x: head.x + Math.cos(this.angle) * this.speed, y: head.y + Math.sin(this.angle) * this.speed };
    this.segments.unshift(next);
    const grew = this.grow > 0;
    let shrink = 0;
    if (this.grow > 0) this.grow--;
    else this.segments.pop();

    if (canBoost) {
      this.boostCounter++;
      // Consume segment every 8 ticks (400ms) of boosting
      if (this.boostCounter >= 8) {
        this.boostCounter = 0;
        if (this.segments.length > 12) {
          this.segments.pop(); // Pop tail segment
          shrink = 1;
        }
      }
    } else {
      this.boostCounter = 0;
    }

    this.score = this.segments.length;
    return { id: this.id, head: next, angle: this.angle, grow: grew, shrink };
  }
}

class Bot extends Snake {
  constructor(id, name, x, y, color, theme) {
    super(id, name, x, y, color, theme);
    this.state = 'ROAM';
    this.target = { x, y };
    this.targetUntil = 0;
  }

  updateAI(room) {
    const head = this.segments[0];
    let threat = null;
    let food = null;
    for (const id in room.snakes) {
      const snake = room.snakes[id];
      if (snake === this || !snake.alive || snake.segments.length <= this.segments.length) continue;
      const other = snake.segments[0];
      const dx = head.x - other.x;
      const dy = head.y - other.y;
      if (dx * dx + dy * dy < 32400) threat = other; // 180 * 180 = 32400
    }
    
    // Find closest food within 250px using spatial grid
    food = room.findNearbyFood(head.x, head.y, 250);

    if (threat) this.state = 'EVADE';
    else if (food) this.state = 'EAT';
    else this.state = 'ROAM';
    this.boost = (this.state === 'EVADE') && this.segments.length > 12;
    let targetAngle = this.angle;
    if (this.state === 'EVADE') targetAngle = Math.atan2(head.y - threat.y, head.x - threat.x) + Math.PI / 4;
    if (this.state === 'EAT') targetAngle = Math.atan2(food.y - head.y, food.x - head.x);
    if (this.state === 'ROAM') {
      const dx = head.x - this.target.x;
      const dy = head.y - this.target.y;
      if (Date.now() > this.targetUntil || dx * dx + dy * dy < 1600) { // 40 * 40 = 1600
        this.target = randomArenaPoint(180);
        this.targetUntil = Date.now() + 6000;
      }
      targetAngle = Math.atan2(this.target.y - head.y, this.target.x - head.x);
    }
    this.targetAngle = targetAngle;
    this.angle = rotateToward(this.angle, targetAngle, Math.PI / 60) + (Math.random() - 0.5) * Math.PI / 180;
  }
}

const BOT_NAMES = [
  'ProPlayer', 'Alpha', 'Nexus', 'Swift', 'Swarm', 'Viper', 'Shadow', 'Ghost', 'Blaze', 
  'Quantum', 'Phoenix', 'Cobart', 'Nebula', 'Apex', 'Raptor', 'Stinger', 'Zenith', 'Hydra', 
  'Striker', 'Titan', 'Fury', 'Goliath', 'Specter', 'Vortex', 'Pulse', 'Crimson'
];

class GameRoom {
  constructor() {
    this.snakes = {};
    this.clients = new Map();
    this.nextId = 1;
    this.lastScores = 0;
    this.ensureBotPopulation();
  }

  addClient(ws, name, theme) {
    const activeTheme = theme || 'classic';
    const spawn = this.randomSpawnPoint();
    const snake = handleGameRestartBuildSnake(Snake, String(this.nextId++), cleanName(name), spawn, activeTheme, THEMES);
    this.snakes[snake.id] = snake;
    this.clients.set(ws, snake.id);
    const populationChanged = this.rebuildBotsNearPlayers();
    ws.send(JSON.stringify({ type: 'init', selfId: snake.id, mapSize: MAP_SIZE, snakes: Object.values(this.snakes), food: [], config: { tickMs: TICK_MS } }));
    if (populationChanged.added.length || populationChanged.removed.length) {
      this.broadcast({ type: 'delta', moved: [], died: populationChanged.removed, sync: true });
    }
  }

  isBotId(id) {
    return String(id).startsWith('bot-');
  }

  aliveHumanCount() {
    let count = 0;
    for (const id in this.snakes) {
      const snake = this.snakes[id];
      if (!this.isBotId(id) && snake.alive) count++;
    }
    return count;
  }

  aliveBotIds() {
    return Object.keys(this.snakes).filter(id => this.isBotId(id) && this.snakes[id].alive);
  }

  targetBotCount() {
    return Math.max(0, MIN_ACTIVE_PLAYERS - this.aliveHumanCount());
  }

  ensureBotPopulation() {
    const target = this.targetBotCount();
    let botIds = this.aliveBotIds();
    const changed = { added: [], removed: [] };

    while (botIds.length < target) {
      const bot = this.addBot();
      changed.added.push(bot.id);
      botIds = this.aliveBotIds();
    }

    while (botIds.length > target) {
      const id = botIds.pop();
      delete this.snakes[id];
      changed.removed.push(id);
    }

    return changed;
  }

  rebuildBotsNearPlayers() {
    const changed = { added: [], removed: [] };
    const target = this.targetBotCount();

    for (const id of this.aliveBotIds()) {
      delete this.snakes[id];
      changed.removed.push(id);
    }

    for (let i = 0; i < target; i++) {
      const bot = this.addBot();
      changed.added.push(bot.id);
    }

    return changed;
  }

  addBot() {
    const botThemes = ['classic', 'neon', 'pastel', 'ocean', 'desert', 'rainbow', 'sunset', 'raccoon', 'bear', 'rabbit'];
    const botTheme = botThemes[Math.floor(Math.random() * botThemes.length)];
    const nameIndex = Math.floor(Math.random() * BOT_NAMES.length);
    const botName = BOT_NAMES[nameIndex] + ' (bot)';
    const color = (THEMES[botTheme] || THEMES.classic).snake;
    const spawn = this.randomBotSpawnPoint();
    const bot = new Bot('bot-' + this.nextId++, botName, spawn.x, spawn.y, color, botTheme);
    this.snakes[bot.id] = bot;
    return bot;
  }

  randomBotSpawnPoint() {
    const humans = Object.keys(this.snakes)
      .map(id => this.snakes[id])
      .filter(snake => snake.alive && !this.isBotId(snake.id) && snake.segments.length);

    if (!humans.length) return this.randomSpawnPoint();

    const player = humans[Math.floor(Math.random() * humans.length)];
    const head = player.segments[0];
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 700 + Math.random() * 1400;
      const point = {
        x: head.x + Math.cos(angle) * distance,
        y: head.y + Math.sin(angle) * distance
      };

      if (isInsideArena(point.x, point.y, 320) && this.isSpawnSafe(point)) {
        return point;
      }
    }

    return this.randomSpawnPoint();
  }

  respawn(ws, theme) {
    const id = this.clients.get(ws);
    const old = this.snakes[id];
    if (!old) return;
    const activeTheme = theme || old.theme || 'classic';
    const spawn = this.randomSpawnPoint(id);
    const snake = handleGameRestartBuildSnake(Snake, id, old.name, spawn, activeTheme, THEMES);
    this.snakes[id] = snake;
    const populationChanged = this.ensureBotPopulation();
    ws.send(JSON.stringify({ type: 'init', selfId: id, mapSize: MAP_SIZE, snakes: Object.values(this.snakes), food: [], config: { tickMs: TICK_MS } }));
    if (populationChanged.added.length || populationChanged.removed.length) {
      this.broadcast({ type: 'delta', moved: [], died: populationChanged.removed, sync: true });
    }
  }

  randomSpawnPoint(ignoreId) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const point = randomArenaPoint(320);
      if (this.isSpawnSafe(point, ignoreId)) return point;
    }
    return randomArenaPoint(320);
  }

  isSpawnSafe(point, ignoreId) {
    const safeDistance = 520;
    const safeDistanceSq = safeDistance * safeDistance;
    for (const id in this.snakes) {
      if (id === ignoreId) continue;
      const snake = this.snakes[id];
      if (!snake.alive) continue;
      for (let i = 0; i < snake.segments.length; i++) {
        const dx = point.x - snake.segments[i].x;
        const dy = point.y - snake.segments[i].y;
        if (dx * dx + dy * dy < safeDistanceSq) return false;
      }
    }
    return true;
  }

  tick() {
    const moved = [];
    const died = [];
    for (const id in this.snakes) if (this.snakes[id] instanceof Bot) this.snakes[id].updateAI(this);
    for (const id in this.snakes) {
      const snake = this.snakes[id];
      const move = snake.move();
      if (move) {
        moved.push({ id: move.id, head: move.head, angle: move.angle, grow: move.grow, shrink: move.shrink, boost: snake.boost });
      }
    }
    this.collide(died);
    const populationChanged = this.ensureBotPopulation();
    this.broadcast({
      type: 'delta',
      moved,
      died: died.concat(populationChanged.removed),
      sync: populationChanged.added.length > 0 || populationChanged.removed.length > 0
    });
    if (Date.now() - this.lastScores > 2000) {
      this.lastScores = Date.now();
      this.broadcast({ type: 'scores', leaderboard: this.leaderboard() });
    }
  }

  findNearbyFood(x, y, maxDistance) {
    // Return null since food is client-side. Bots roam naturally.
    return null;
  }

  collide(died) {
    const grid = new Map();
    for (const id in this.snakes) {
      const snake = this.snakes[id];
      if (!snake.alive) continue;
      for (let i = 0; i < snake.segments.length; i++) {
        const segment = snake.segments[i];
        const key = cellKey(segment.x, segment.y);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push({ id, index: i, segment });
      }
    }
    for (const id in this.snakes) {
      const snake = this.snakes[id];
      if (!snake.alive) continue;
      const head = snake.segments[0];
      if (!isInsideArena(head.x, head.y, snake.radius())) {
        this.kill(id, died, 'Wall');
        continue;
      }
      const cx = Math.floor(head.x / CELL_SIZE);
      const cy = Math.floor(head.y / CELL_SIZE);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const items = grid.get(gx + ',' + gy) || [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.id === id) continue;
            const other = this.snakes[item.id];
            if (!other || !other.alive) continue;
            const dx = head.x - item.segment.x;
            const dy = head.y - item.segment.y;
            const r = snake.radius() + other.radius();
            if (dx * dx + dy * dy < r * r) {
              if (item.index === 0) {
                if (snake.segments.length > other.segments.length) {
                  this.kill(item.id, died, snake.name);
                } else if (snake.segments.length < other.segments.length) {
                  this.kill(id, died, other.name);
                } else {
                  this.kill(id, died, other.name);
                  this.kill(item.id, died, snake.name);
                }
              } else {
                this.kill(id, died, other.name);
              }
            }
          }
        }
      }
    }
  }

  kill(id, died, by) {
    const snake = this.snakes[id];
    if (!snake || !snake.alive) return;
    snake.alive = false;
    died.push(id);
    for (const pair of this.clients.entries()) {
      if (pair[1] === id) pair[0].send(JSON.stringify({ type: 'killed', by }));
    }
    if (this.isBotId(id)) delete this.snakes[id];
  }

  leaderboard() {
    return Object.values(this.snakes).filter(s => s.alive).sort((a, b) => b.segments.length - a.segments.length).slice(0, 10).map(s => ({ id: s.id, name: s.name, length: s.segments.length }));
  }

  broadcast(message) {
    for (const [ws, clientId] of this.clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    
    const clientSnake = this.snakes[clientId];
    if (!clientSnake || message.type !== 'delta') {
      ws.send(JSON.stringify(message)); 
      continue;
    }
    
    const head = clientSnake.segments[0];
    const VIEW = 2400;
    const shouldSyncAll = message.sync === true;
    const filtered = {
      ...message,
      snakes: Object.values(this.snakes).filter(s => {
        if (!s.alive || s.id === clientId) return false;
        if (shouldSyncAll || this.isBotId(s.id)) return true;
        const sh = s.segments[0];
        return Math.abs(sh.x - head.x) < VIEW && Math.abs(sh.y - head.y) < VIEW;
      }),
      moved: message.moved.filter(m => {
        const s = this.snakes[m.id];
        if (!s || m.id === clientId) return true;
        if (shouldSyncAll || this.isBotId(m.id)) return true;
        const sh = s.segments[0];
        return Math.abs(sh.x - head.x) < VIEW && Math.abs(sh.y - head.y) < VIEW;
      })
    };
    ws.send(JSON.stringify(filtered));
  }
  }
}

const room = new GameRoom();
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Swarm IO backend');
});
const wss = new WebSocket.Server({ server, origin: '*' });
wss.on('connection', ws => {
  ws.on('message', data => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (error) {
      return;
    }
    if (message.type === 'join') room.addClient(ws, message.name, message.theme);
    if (message.type === 'input') {
      const snake = room.snakes[room.clients.get(ws)];
      if (snake) {
        if (Number.isFinite(message.angle)) snake.targetAngle = message.angle;
        if (typeof message.boost === 'boolean') snake.boost = message.boost;
      }
    }
    if (message.type === 'eat') {
      const snake = room.snakes[message.snakeId];
      if (snake && Number.isFinite(message.value)) {
        snake.grow += message.value;
      }
    }
    if (message.type === 'respawn') room.respawn(ws, message.theme);
  });
  ws.on('close', () => {
    const id = room.clients.get(ws);
    room.clients.delete(ws);
    if (id && room.snakes[id]) delete room.snakes[id];
    const populationChanged = room.ensureBotPopulation();
    room.broadcast({
      type: 'delta',
      moved: [],
      died: (id ? [id] : []).concat(populationChanged.removed),
      sync: populationChanged.added.length > 0 || populationChanged.removed.length > 0
    });
  });
});
setInterval(() => room.tick(), TICK_MS);
server.listen(PORT, () => console.log('Swarm IO server listening on ' + PORT));
