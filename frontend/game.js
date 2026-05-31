import {
  THEME_KEYS,
  FOOD_COLORS,
  lerp,
  hexToRgba,
  snakeRadius,
  randomArenaPoint,
  isInsideArena,
  rotateToward
} from './utils/playerMovement.js';

import {
  loadHighScore,
  saveHighScore,
  loadSelectedTheme,
  saveSelectedTheme,
  updateHighestScore
} from './utils/scoreLose.js';

import {
  showStartScreen,
  showGameScreen,
  showGameOverScreen
} from './utils/startScreens.js';

import {
  handleGameRestartResetUi
} from './utils/gameRestart.js';

import {
  handleCollisionInteractionBuildFoodGroups,
  handleCollisionInteractionSpawnFoodAt,
  handleCollisionInteractionSpawnFoodRandomly
} from './utils/collisionInteraction.js';

const SERVER_URLS = [
  'wss://swarmio.duckdns.org',
  'ws://swarmio.duckdns.org:3000'
];
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const lobby = document.getElementById('screen-lobby');
const highestScoreText = document.getElementById('highest-score');
const nameInput = document.getElementById('player-name');
const playButton = document.getElementById('play-button');
const skinSelectorBtn = document.getElementById('skin-selector-btn');
const lobbyMainUi = document.getElementById('lobby-main-ui');
const skinSelectorUi = document.getElementById('skin-selector-ui');
const skinPrevBtn = document.getElementById('skin-prev-btn');
const skinNextBtn = document.getElementById('skin-next-btn');
const skinSaveBtn = document.getElementById('skin-save-btn');
const previewCanvas = document.getElementById('skin-preview-canvas');
const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;
const finalScoreText = document.getElementById('final-score');
const deathScoreContainer = document.getElementById('death-score-container');
const previewSnake = {
  alive: true,
  boost: false,
  angle: 0,
  theme: 'classic',
  color: '#34d399',
  name: 'Player',
  segments: []
};
let previewAnimId = null;

// Glowing background nebulae state
const NEBULAE = [];
function initNebulae(mapSize) {
  NEBULAE.length = 0;
  const colors = [
    'rgba(147, 51, 234, 0.13)', // Neon Purple
    'rgba(59, 130, 246, 0.13)',  // Neon Blue
    'rgba(16, 185, 129, 0.10)',  // Neon Green
    'rgba(236, 72, 153, 0.13)',  // Neon Pink
    'rgba(245, 158, 11, 0.10)',  // Neon Orange
    'rgba(239, 68, 68, 0.10)'    // Neon Red
  ];
  // Increase nebulae count since map size is much larger
  const count = Math.round(mapSize / 150);
  for (let i = 0; i < count; i++) {
    NEBULAE.push({
      x: Math.random() * mapSize,
      y: Math.random() * mapSize,
      radius: 500 + Math.random() * 500,
      color: colors[i % colors.length]
    });
  }
}

class Renderer {
  constructor(context) {
    this.ctx = context;
    this.width = 0;
    this.height = 0;
    this.centerX = 0;
    this.centerY = 0;
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.centerX = Math.round(this.width / 2);
    this.centerY = Math.round(this.height / 2);
    canvas.width = this.width;
    canvas.height = this.height;
  }

  draw(state) {
    const context = this.ctx;
    const player = state.snakes[state.selfId];
    let cameraX = this.centerX;
    let cameraY = this.centerY;
    if (player && player.segments.length) {
      cameraX = lerp(player.renderX, player.segments[0].x, 0.35);
      cameraY = lerp(player.renderY, player.segments[0].y, 0.35);
      player.renderX = cameraX;
      player.renderY = cameraY;
    }
    const camLeft = cameraX - this.centerX;
    const camRight = cameraX + this.centerX;
    const camTop = cameraY - this.centerY;
    const camBottom = cameraY + this.centerY;
    
    context.clearRect(0, 0, this.width, this.height);
    context.save();
    context.translate(Math.round(-cameraX + this.centerX), Math.round(-cameraY + this.centerY));
    
    // Draw background color and translucent glowing nebulae first
    this.drawNebulae(context, camLeft, camRight, camTop, camBottom);
    
    // Draw hexagons on top
    this.drawGrid(context, state, camLeft, camRight, camTop, camBottom);
    
    // Draw entities
    this.drawFood(context, state, camLeft, camRight, camTop, camBottom);
    this.drawSnakes(context, state, camLeft, camRight, camTop, camBottom);
    
    context.restore();
    this.drawHud(context, state);
  }

  drawNebulae(context, left, right, top, bottom) {
    context.save();
    context.globalCompositeOperation = 'screen';
    for (let i = 0; i < NEBULAE.length; i++) {
      const neb = NEBULAE[i];
      if (neb.x < left - neb.radius || neb.x > right + neb.radius ||
          neb.y < top - neb.radius || neb.y > bottom + neb.radius) {
        continue;
      }
      const grad = context.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.radius);
      grad.addColorStop(0, neb.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = grad;
      context.beginPath();
      context.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  drawGrid(context, state, left, right, top, bottom) {
    const hexSize = 46;
    const xStep = Math.sqrt(3) * hexSize;
    const yStep = 1.5 * hexSize;
    const padding = hexSize * 2;
    const startRow = Math.floor((top - padding) / yStep);
    const endRow = Math.ceil((bottom + padding) / yStep);

    context.save();
    for (let row = startRow; row <= endRow; row++) {
      const y = row * yStep;
      const rowOffset = row % 2 === 0 ? 0 : xStep / 2;
      const startCol = Math.floor((left - padding - rowOffset) / xStep);
      const endCol = Math.ceil((right + padding - rowOffset) / xStep);

      for (let col = startCol; col <= endCol; col++) {
        const x = col * xStep + rowOffset;
        if (!isInsideArena(x, y, state.mapSize, hexSize)) continue;
        this.drawHex(context, x, y, hexSize);
      }
    }

    context.strokeStyle = 'rgba(232, 237, 247, 0.16)';
    context.lineWidth = 8;
    context.beginPath();
    context.arc(state.mapSize / 2, state.mapSize / 2, state.mapSize / 2, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  drawHex(context, x, y, size) {
    const scale = 0.86; // Leaves a perfect, distinct gap between hexagons
    const hexRadius = size * scale;
    
    // 1. Draw Offset Drop Shadow (Simulates premium 3D raised shadow exactly)
    context.fillStyle = 'rgba(0, 0, 0, 0.65)';
    context.beginPath();
    const shadowOffsetX = 3.5;
    const shadowOffsetY = 5.0;
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 6 + i * Math.PI / 3;
      const px = Math.round(x + shadowOffsetX + Math.cos(angle) * hexRadius);
      const py = Math.round(y + shadowOffsetY + Math.sin(angle) * hexRadius);
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    
    // 2. Draw Main Hexagon Tile (Exact color matching reference image)
    context.fillStyle = '#1c222e';
    context.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 6 + i * Math.PI / 3;
      const px = Math.round(x + Math.cos(angle) * hexRadius);
      const py = Math.round(y + Math.sin(angle) * hexRadius);
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    
    // 3. Draw Crisp Raised Edge
    context.strokeStyle = '#272f3e';
    context.lineWidth = 1;
    context.stroke();
  }

  drawFood(context, state, left, right, top, bottom) {
    // Beautiful rhythmic pulsating glow using sine wave
    const pulse = 0.38 + 0.22 * Math.sin(Date.now() * 0.007);
    
    for (const color in state.foodByColor) {
      const items = state.foodByColor[color];
      
      // Draw pulsating glows
      context.fillStyle = color;
      context.globalAlpha = pulse;
      context.beginPath();
      for (let i = 0; i < items.length; i++) {
        const food = items[i];
        if (food.x < left - 30 || food.x > right + 30 || food.y < top - 30 || food.y > bottom + 30) continue;
        const glowRadius = food.radius * (food.value > 1 ? 3.2 : 2.6);
        context.moveTo(food.x + glowRadius, food.y);
        context.arc(food.x, food.y, glowRadius, 0, Math.PI * 2);
      }
      context.fill();
      
      // Draw solid cores
      context.globalAlpha = 1.0;
      context.beginPath();
      for (let i = 0; i < items.length; i++) {
        const food = items[i];
        if (food.x < left - 20 || food.x > right + 20 || food.y < top - 20 || food.y > bottom + 20) continue;
        context.moveTo(food.x + food.radius, food.y);
        context.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
      }
      context.fill();
    }
  }

  drawSnakes(context, state, left, right, top, bottom) {
    for (const id in state.snakes) {
      const snake = state.snakes[id];
      if (!snake.alive || !snake.segments.length) continue;
      
      const radius = snakeRadius(snake);
      
      // Update all segment render coordinates first
      for (let i = 0; i < snake.segments.length; i++) {
        const segment = snake.segments[i];
        segment.renderX = lerp(segment.renderX, segment.x, 0.35);
        segment.renderY = lerp(segment.renderY, segment.y, 0.35);
      }
      
      const head = snake.segments[0];
      
      // 1. Draw a beautiful soft ambient glow under the head (especially when boosting!)
      if (head.renderX >= left - 200 && head.renderX <= right + 200 &&
          head.renderY >= top - 200 && head.renderY <= bottom + 200) {
        context.save();
        context.globalCompositeOperation = 'screen';
        const glowRadius = snake.boost ? radius * 6.5 : radius * 3.5;
        const glowAlpha = snake.boost ? 0.32 : 0.14;
        const grad = context.createRadialGradient(head.renderX, head.renderY, 0, head.renderX, head.renderY, glowRadius);
        grad.addColorStop(0, hexToRgba(snake.color, glowAlpha));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = grad;
        context.beginPath();
        context.arc(head.renderX, head.renderY, glowRadius, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      
      // 2. Draw Snake Body smoothly using a single continuous thick path stroke!
      context.save();
      context.lineCap = 'round';
      context.lineJoin = 'round';
      
      // Setup styles based on theme
      let strokeStyle = snake.color;
      
      if (snake.theme === 'rainbow' || snake.theme === 'sunset') {
        const tail = snake.segments[snake.segments.length - 1];
        const grad = context.createLinearGradient(head.renderX, head.renderY, tail.renderX, tail.renderY);
        if (snake.theme === 'rainbow') {
          grad.addColorStop(0, '#ff4b5c');
          grad.addColorStop(0.2, '#ffb84d');
          grad.addColorStop(0.4, '#c9e75b');
          grad.addColorStop(0.6, '#06b6d4');
          grad.addColorStop(0.8, '#8b5cf6');
          grad.addColorStop(1, '#ff4b5c');
        } else { // sunset
          grad.addColorStop(0, '#f97316');
          grad.addColorStop(0.5, '#ec4899');
          grad.addColorStop(1, '#8b5cf6');
        }
        strokeStyle = grad;
      } else if (snake.theme === 'raccoon') {
        // Striped grey/dark grey body gradient
        const tail = snake.segments[snake.segments.length - 1];
        const grad = context.createLinearGradient(head.renderX, head.renderY, tail.renderX, tail.renderY);
        for (let i = 0; i <= 10; i++) {
          grad.addColorStop(i / 10, i % 2 === 0 ? '#4b5563' : '#1f2937');
        }
        strokeStyle = grad;
      } else if (snake.theme === 'bear') {
        const tail = snake.segments[snake.segments.length - 1];
        const grad = context.createLinearGradient(head.renderX, head.renderY, tail.renderX, tail.renderY);
        for (let i = 0; i <= 10; i++) {
          grad.addColorStop(i / 10, i % 2 === 0 ? '#78350f' : '#b45309');
        }
        strokeStyle = grad;
      } else if (snake.theme === 'rabbit') {
        const tail = snake.segments[snake.segments.length - 1];
        const grad = context.createLinearGradient(head.renderX, head.renderY, tail.renderX, tail.renderY);
        for (let i = 0; i <= 10; i++) {
          grad.addColorStop(i / 10, i % 2 === 0 ? '#f3f4f6' : '#fae8ff');
        }
        strokeStyle = grad;
      }
      
      // Draw outer body glow pass
      context.strokeStyle = strokeStyle;
      context.globalAlpha = 0.38;
      context.lineWidth = radius * 2.5;
      context.beginPath();
      context.moveTo(snake.segments[0].renderX, snake.segments[0].renderY);
      for (let i = 1; i < snake.segments.length; i++) {
        context.lineTo(snake.segments[i].renderX, snake.segments[i].renderY);
      }
      context.stroke();
      
      // Draw solid body core pass
      context.globalAlpha = 1.0;
      context.lineWidth = radius * 2.0;
      context.strokeStyle = strokeStyle;
      context.beginPath();
      context.moveTo(snake.segments[0].renderX, snake.segments[0].renderY);
      for (let i = 1; i < snake.segments.length; i++) {
        context.lineTo(snake.segments[i].renderX, snake.segments[i].renderY);
      }
      context.stroke();
      
      context.restore();
      
      // Draw custom tail if animal theme
      if (snake.theme === 'raccoon' || snake.theme === 'bear' || snake.theme === 'rabbit') {
        this.drawTail(context, snake, radius);
      }
      
      // 3. Draw Head (eyeballs, pupils, etc.) on top
      if (head.renderX >= left - 50 && head.renderX <= right + 50 &&
          head.renderY >= top - 50 && head.renderY <= bottom + 50) {
        this.drawHead(context, snake, radius * 1.25);
        this.drawSnakeName(context, snake, radius);
      }
    }
  }

  drawSnakeName(context, snake, radius) {
    const head = snake.segments[0];
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.font = '600 13px Fredoka, sans-serif';
    
    // Draw name with a semi-transparent white/grey color and a subtle dark outline for readability
    context.fillStyle = 'rgba(232, 237, 247, 0.85)';
    context.strokeStyle = 'rgba(12, 13, 18, 0.8)';
    context.lineWidth = 3;
    
    const nameY = head.renderY + radius * 1.6; // Render slightly below the snake head
    context.strokeText(snake.name, head.renderX, nameY);
    context.fillText(snake.name, head.renderX, nameY);
    context.restore();
  }

  drawHead(context, snake, radius) {
    const head = snake.segments[0];
    const x = Math.round(head.renderX);
    const y = Math.round(head.renderY);
    
    // Draw custom animal ears/features BEFORE eyeballs
    if (snake.theme === 'raccoon') {
      // Raccoon Ears: Two small grey circles on top of the head
      context.fillStyle = '#4b5563';
      context.beginPath();
      // Left Ear
      const leftEarX = x + Math.cos(snake.angle + Math.PI * 0.75) * radius;
      const leftEarY = y + Math.sin(snake.angle + Math.PI * 0.75) * radius;
      context.arc(leftEarX, leftEarY, radius * 0.45, 0, Math.PI * 2);
      // Right Ear
      const rightEarX = x + Math.cos(snake.angle - Math.PI * 0.75) * radius;
      const rightEarY = y + Math.sin(snake.angle - Math.PI * 0.75) * radius;
      context.arc(rightEarX, rightEarY, radius * 0.45, 0, Math.PI * 2);
      context.fill();
      
      // Raccoon inner ears (white)
      context.fillStyle = '#f3f4f6';
      context.beginPath();
      context.arc(leftEarX, leftEarY, radius * 0.25, 0, Math.PI * 2);
      context.arc(rightEarX, rightEarY, radius * 0.25, 0, Math.PI * 2);
      context.fill();
    } else if (snake.theme === 'bear') {
      // Bear Ears: Round brown ears
      context.fillStyle = '#78350f';
      context.beginPath();
      const leftEarX = x + Math.cos(snake.angle + Math.PI * 0.7) * radius;
      const leftEarY = y + Math.sin(snake.angle + Math.PI * 0.7) * radius;
      context.arc(leftEarX, leftEarY, radius * 0.5, 0, Math.PI * 2);
      const rightEarX = x + Math.cos(snake.angle - Math.PI * 0.7) * radius;
      const rightEarY = y + Math.sin(snake.angle - Math.PI * 0.7) * radius;
      context.arc(rightEarX, rightEarY, radius * 0.5, 0, Math.PI * 2);
      context.fill();
      
      // Bear inner ears (pink)
      context.fillStyle = '#fbcfe8';
      context.beginPath();
      context.arc(leftEarX, leftEarY, radius * 0.3, 0, Math.PI * 2);
      context.arc(rightEarX, rightEarY, radius * 0.3, 0, Math.PI * 2);
      context.fill();
    } else if (snake.theme === 'rabbit') {
      // Rabbit Ears: Long ears extending backwards/upwards
      context.fillStyle = '#f3f4f6';
      context.save();
      // Left Ear
      context.beginPath();
      const leftEarX = x + Math.cos(snake.angle + Math.PI * 0.8) * radius;
      const leftEarY = y + Math.sin(snake.angle + Math.PI * 0.8) * radius;
      context.translate(leftEarX, leftEarY);
      context.rotate(snake.angle + Math.PI * 0.5);
      context.ellipse(0, 0, radius * 0.25, radius * 0.85, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
      
      // Left inner ear (pink)
      context.fillStyle = '#fbcfe8';
      context.save();
      context.beginPath();
      context.translate(leftEarX, leftEarY);
      context.rotate(snake.angle + Math.PI * 0.5);
      context.ellipse(0, 0, radius * 0.13, radius * 0.6, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
      
      // Right Ear
      context.fillStyle = '#f3f4f6';
      context.save();
      context.beginPath();
      const rightEarX = x + Math.cos(snake.angle - Math.PI * 0.8) * radius;
      const rightEarY = y + Math.sin(snake.angle - Math.PI * 0.8) * radius;
      context.translate(rightEarX, rightEarY);
      context.rotate(snake.angle - Math.PI * 0.5);
      context.ellipse(0, 0, radius * 0.25, radius * 0.85, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
      
      // Right inner ear (pink)
      context.fillStyle = '#fbcfe8';
      context.save();
      context.beginPath();
      context.translate(rightEarX, rightEarY);
      context.rotate(snake.angle - Math.PI * 0.5);
      context.ellipse(0, 0, radius * 0.13, radius * 0.6, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    
    // Draw Base Head Circle
    context.fillStyle = snake.theme === 'raccoon' ? '#4b5563' : 
                        snake.theme === 'bear' ? '#78350f' : 
                        snake.theme === 'rabbit' ? '#f3f4f6' : snake.color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    
    // Eyeballs
    const eyeSpacing = radius * 0.42;
    const eyeForward = radius * 0.42;
    
    const leftEyeX = x + Math.cos(snake.angle) * eyeForward + Math.cos(snake.angle + Math.PI / 2) * eyeSpacing;
    const leftEyeY = y + Math.sin(snake.angle) * eyeForward + Math.sin(snake.angle + Math.PI / 2) * eyeSpacing;
    
    const rightEyeX = x + Math.cos(snake.angle) * eyeForward + Math.cos(snake.angle - Math.PI / 2) * eyeSpacing;
    const rightEyeY = y + Math.sin(snake.angle) * eyeForward + Math.sin(snake.angle - Math.PI / 2) * eyeSpacing;
    
    const eyeballRadius = radius * 0.32;
    const pupilRadius = eyeballRadius * 0.55;
    
    // Draw Raccoon eye mask
    if (snake.theme === 'raccoon') {
      context.fillStyle = '#1f2937'; // Dark mask
      context.save();
      context.beginPath();
      context.ellipse(x + Math.cos(snake.angle) * eyeForward, y + Math.sin(snake.angle) * eyeForward, radius * 0.85, radius * 0.35, snake.angle + Math.PI / 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    
    // Eyeballs
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(leftEyeX, leftEyeY, eyeballRadius, 0, Math.PI * 2);
    context.arc(rightEyeX, rightEyeY, eyeballRadius, 0, Math.PI * 2);
    context.fill();
    
    // Pupils
    const pupilOffsetX = Math.cos(snake.angle) * (eyeballRadius * 0.22);
    const pupilOffsetY = Math.sin(snake.angle) * (eyeballRadius * 0.22);
    
    context.fillStyle = '#000000';
    context.beginPath();
    context.arc(leftEyeX + pupilOffsetX, leftEyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    context.arc(rightEyeX + pupilOffsetX, rightEyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    context.fill();
    
    // Shiny pupil reflection
    const highlightOffsetX = Math.cos(snake.angle - Math.PI / 4) * (pupilRadius * 0.3);
    const highlightOffsetY = Math.sin(snake.angle - Math.PI / 4) * (pupilRadius * 0.3);
    
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(leftEyeX + pupilOffsetX + highlightOffsetX, leftEyeY + pupilOffsetY + highlightOffsetY, pupilRadius * 0.35, 0, Math.PI * 2);
    context.arc(rightEyeX + pupilOffsetX + highlightOffsetX, rightEyeY + pupilOffsetY + highlightOffsetY, pupilRadius * 0.35, 0, Math.PI * 2);
    context.fill();
    
    // Draw Animal Snouts/Noses
    if (snake.theme === 'raccoon') {
      // Raccoon Snout (white muzzle)
      context.fillStyle = '#f3f4f6'; // Light grey/white
      context.beginPath();
      const snoutX = x + Math.cos(snake.angle) * (radius * 0.45);
      const snoutY = y + Math.sin(snake.angle) * (radius * 0.45);
      context.arc(snoutX, snoutY, radius * 0.32, 0, Math.PI * 2);
      context.fill();
      
      // Raccoon Nose
      context.fillStyle = '#000000';
      context.beginPath();
      context.arc(snoutX + Math.cos(snake.angle) * (radius * 0.15), snoutY + Math.sin(snake.angle) * (radius * 0.15), radius * 0.12, 0, Math.PI * 2);
      context.fill();
    } else if (snake.theme === 'bear') {
      // Bear Snout
      context.fillStyle = '#d97706'; // Tan
      context.beginPath();
      const snoutX = x + Math.cos(snake.angle) * (radius * 0.45);
      const snoutY = y + Math.sin(snake.angle) * (radius * 0.45);
      context.arc(snoutX, snoutY, radius * 0.35, 0, Math.PI * 2);
      context.fill();
      
      // Bear Nose
      context.fillStyle = '#000000';
      context.beginPath();
      context.arc(snoutX + Math.cos(snake.angle) * (radius * 0.15), snoutY + Math.sin(snake.angle) * (radius * 0.15), radius * 0.12, 0, Math.PI * 2);
      context.fill();
    } else if (snake.theme === 'rabbit') {
      // Rabbit Nose
      context.fillStyle = '#f472b6'; // Pink
      context.beginPath();
      const snoutX = x + Math.cos(snake.angle) * (radius * 0.55);
      const snoutY = y + Math.sin(snake.angle) * (radius * 0.55);
      context.arc(snoutX, snoutY, radius * 0.14, 0, Math.PI * 2);
      context.fill();
    }
  }

  drawTail(context, snake, radius) {
    const tail = snake.segments[snake.segments.length - 1];
    if (!tail) return;
    const preTail = snake.segments[snake.segments.length - 2] || tail;
    const angle = Math.atan2(tail.renderY - preTail.renderY, tail.renderX - preTail.renderX);
    
    if (snake.theme === 'raccoon') {
      context.save();
      context.translate(tail.renderX, tail.renderY);
      context.rotate(angle);
      
      // Draw a bushy raccoon tail extending backwards
      context.fillStyle = '#4b5563';
      context.beginPath();
      context.ellipse(-radius * 0.8, 0, radius * 1.5, radius * 0.9, 0, 0, Math.PI * 2);
      context.fill();
      
      // Draw black stripes on raccoon tail
      context.fillStyle = '#1f2937';
      for (let i = 0; i < 3; i++) {
        context.beginPath();
        context.ellipse(-radius * (0.4 + i * 0.5), 0, radius * 0.18, radius * 0.85, 0, 0, Math.PI * 2);
        context.fill();
      }
      
      // Black tail tip
      context.fillStyle = '#111827';
      context.beginPath();
      context.arc(-radius * 2.0, 0, radius * 0.45, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else if (snake.theme === 'bear') {
      context.save();
      context.translate(tail.renderX, tail.renderY);
      context.rotate(angle);
      
      // Cute stubby round brown tail puff
      context.fillStyle = '#78350f';
      context.beginPath();
      context.arc(-radius * 0.8, 0, radius * 0.65, 0, Math.PI * 2);
      context.fill();
      
      // Inner soft puff
      context.fillStyle = '#92400e';
      context.beginPath();
      context.arc(-radius * 0.8, 0, radius * 0.4, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else if (snake.theme === 'rabbit') {
      context.save();
      context.translate(tail.renderX, tail.renderY);
      context.rotate(angle);
      
      // Fluffy bunny puffball tail
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(-radius * 0.8, 0, radius * 0.75, 0, Math.PI * 2);
      context.fill();
      
      // Pink center
      context.fillStyle = '#fbcfe8';
      context.beginPath();
      context.arc(-radius * 0.8, 0, radius * 0.45, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  drawHud(context, state) {
    const player = state.snakes[state.selfId];
    
    // Bottom-Left Info (Length and Rank)
    context.save();
    context.fillStyle = 'rgba(255, 255, 255, 0.75)';
    context.font = '600 14px Fredoka';
    context.shadowColor = 'rgba(0,0,0,0.5)';
    context.shadowBlur = 4;
    context.fillText('Your length: ' + (player ? player.segments.length : 0), 16, this.height - 34);
    context.fillStyle = 'rgba(255, 255, 255, 0.55)';
    context.font = '500 13px Fredoka';
    context.fillText('Your rank: 1 of ' + Math.max(1, this.countAlive(state)), 16, this.height - 16);
    context.restore();
    
    // Bottom-Right Minimap
    context.save();
    const mapRadius = 45;
    const mapCenterX = this.width - 60;
    const mapCenterY = this.height - 70;
    
    context.fillStyle = 'rgba(10, 15, 25, 0.55)';
    context.beginPath();
    context.arc(mapCenterX, mapCenterY, mapRadius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    context.lineWidth = 1.5;
    context.stroke();
    
    for (const id in state.snakes) {
      const snake = state.snakes[id];
      if (!snake.alive || !snake.segments.length) continue;
      context.fillStyle = id === state.selfId ? '#ffffff' : snake.color;
      const snX = mapCenterX + (snake.segments[0].x / state.mapSize - 0.5) * (mapRadius * 1.8);
      const snY = mapCenterY + (snake.segments[0].y / state.mapSize - 0.5) * (mapRadius * 1.8);
      context.beginPath();
      context.arc(snX, snY, id === state.selfId ? 2.5 : 1.8, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    
    // Server name below minimap
    context.save();
    context.textAlign = 'center';
    context.fillStyle = 'rgba(255, 255, 255, 0.45)';
    context.font = '500 11px Fredoka';
    context.fillText('server 4490', mapCenterX, this.height - 14);
    context.restore();
    
    // Top-Right Leaderboard
    context.save();
    context.textAlign = 'right';
    context.shadowColor = 'rgba(0,0,0,0.6)';
    context.shadowBlur = 4;
    
    context.font = '700 19px Fredoka';
    context.fillStyle = '#e8edf7';
    context.fillText('Leaderboard', this.width - 20, 30);
    
    context.font = '600 13px Fredoka';
    const colors = ['#8f54ff', '#ff4b65', '#51a7ff', '#ffb84d', '#c9e75b'];
    for (let i = 0; i < state.leaderboard.length && i < 10; i++) {
      const row = state.leaderboard[i];
      const yPos = 56 + i * 20;
      
      context.fillStyle = row.id === state.selfId ? '#ffffff' : colors[i % colors.length];
      context.fillText('#' + (i + 1) + '   ' + row.name, this.width - 80, yPos);
      
      context.fillStyle = 'rgba(255, 255, 255, 0.7)';
      context.fillText(row.length, this.width - 20, yPos);
    }
    context.restore();
  }

  countAlive(state) {
    let count = 0;
    for (const id in state.snakes) if (state.snakes[id].alive) count++;
    return count;
  }
}

const THEMES = {
  classic: { background: '#101922', grid: 'rgba(255,255,255,0.07)', snake: '#b7eee8', food: ['#f87171', '#facc15', '#60a5fa', '#d946ef', '#a7f3d0'] },
  neon: { background: '#101922', grid: 'rgba(236,72,153,0.16)', snake: '#22d3ee', food: ['#f0abfc', '#a3e635', '#fb7185', '#67e8f9'] },
  pastel: { background: '#101922', grid: 'rgba(255,255,255,0.08)', snake: '#f9a8d4', food: ['#bfdbfe', '#bbf7d0', '#fde68a', '#ddd6fe'] },
  ocean: { background: '#101922', grid: 'rgba(125,211,252,0.14)', snake: '#38bdf8', food: ['#99f6e4', '#fef08a', '#c4b5fd', '#93c5fd'] },
  desert: { background: '#101922', grid: 'rgba(251,191,36,0.12)', snake: '#fb923c', food: ['#fef3c7', '#fdba74', '#bef264', '#fca5a5'] },
  rainbow: { background: '#101922', grid: 'rgba(255,255,255,0.07)', snake: '#f43f5e', food: ['#f87171', '#facc15', '#60a5fa', '#34d399', '#a855f7'] },
  sunset: { background: '#101922', grid: 'rgba(255,255,255,0.07)', snake: '#ec4899', food: ['#fdba74', '#fb7185', '#a855f7', '#f43f5e'] },
  raccoon: { background: '#101922', grid: 'rgba(255,255,255,0.07)', snake: '#4b5563', food: ['#6b7280', '#e5e7eb', '#374151'] },
  bear: { background: '#101922', grid: 'rgba(255,255,255,0.07)', snake: '#78350f', food: ['#b45309', '#f59e0b', '#d97706'] },
  rabbit: { background: '#101922', grid: 'rgba(255,255,255,0.07)', snake: '#f3f4f6', food: ['#fbcfe8', '#e5e7eb', '#ffffff'] }
};

const renderer = new Renderer(ctx);
// Map size set to much larger 10000 (battleground size increased!)
const state = { selfId: null, mapSize: 10000, snakes: {}, food: [], foodByColor: {}, leaderboard: [], theme: THEMES.classic };
const MIN_LOCAL_ENTITIES = 10;
const LOCAL_BOT_NAMES = ['Alpha', 'Nexus', 'Swift', 'Viper', 'Blaze', 'Apex', 'Hydra', 'Nova', 'Pulse', 'Echo', 'Orbit', 'Comet'];
let socket = null;
let selectedTheme = loadSelectedTheme();
let lastInputAt = 0;
let localMode = false;
let localSnake = null;
let animationStarted = false;
let localBotCounter = 0;

// Trigger nebulae initialization with increased map size
initNebulae(state.mapSize);
updateHighestScore(highestScoreText, loadHighScore());

function isLocalBotId(id) {
  return String(id).startsWith('local-bot-');
}

function createLocalSnake(id, name, x, y, color, theme, isBot) {
  const snake = {
    id,
    name,
    angle: Math.random() * Math.PI * 2,
    targetAngle: 0,
    speed: isBot ? 2.35 : 1.6,
    color,
    alive: true,
    score: 10,
    segments: [],
    theme,
    isBot: Boolean(isBot),
    target: { x, y },
    targetUntil: 0
  };
  snake.targetAngle = snake.angle;
  for (let i = 0; i < 12; i++) {
    snake.segments.push({ x: x - i * 8, y, renderX: x - i * 8, renderY: y });
  }
  snake.renderX = snake.segments[0].x;
  snake.renderY = snake.segments[0].y;
  return snake;
}

function randomPointNearLocalPlayer() {
  if (!localSnake || !localSnake.segments.length) return randomArenaPoint(state.mapSize, 320);
  const head = localSnake.segments[0];
  for (let attempt = 0; attempt < 40; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 700 + Math.random() * 1400;
    const point = {
      x: head.x + Math.cos(angle) * distance,
      y: head.y + Math.sin(angle) * distance
    };
    if (isInsideArena(point.x, point.y, state.mapSize, 320)) return point;
  }
  return randomArenaPoint(state.mapSize, 320);
}

function addLocalBot() {
  const theme = THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)];
  const themeConfig = THEMES[theme] || THEMES.classic;
  const point = randomPointNearLocalPlayer();
  const id = 'local-bot-' + (++localBotCounter);
  const name = LOCAL_BOT_NAMES[localBotCounter % LOCAL_BOT_NAMES.length] + ' (bot)';
  const bot = createLocalSnake(id, name, point.x, point.y, themeConfig.snake, theme, true);
  state.snakes[id] = bot;
  return bot;
}

function ensureLocalBotPopulation() {
  if (!localMode || !localSnake || !localSnake.alive) return;
  const aliveHumans = Object.keys(state.snakes).filter(id => !isLocalBotId(id) && state.snakes[id].alive).length;
  const targetBots = Math.max(0, MIN_LOCAL_ENTITIES - aliveHumans);
  let botIds = Object.keys(state.snakes).filter(id => isLocalBotId(id) && state.snakes[id].alive);

  while (botIds.length < targetBots) {
    addLocalBot();
    botIds = Object.keys(state.snakes).filter(id => isLocalBotId(id) && state.snakes[id].alive);
  }

  while (botIds.length > targetBots) {
    const id = botIds.pop();
    delete state.snakes[id];
  }
}

function chooseLocalBotTarget(bot) {
  const head = bot.segments[0];
  let bestFood = null;
  let bestFoodDist = Infinity;
  for (let i = 0; i < state.food.length; i++) {
    const food = state.food[i];
    const dx = food.x - head.x;
    const dy = food.y - head.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestFoodDist && dist < 700 * 700) {
      bestFood = food;
      bestFoodDist = dist;
    }
  }

  if (bestFood) {
    bot.target = { x: bestFood.x, y: bestFood.y };
    return;
  }

  const dx = head.x - bot.target.x;
  const dy = head.y - bot.target.y;
  if (Date.now() > bot.targetUntil || dx * dx + dy * dy < 1600) {
    bot.target = randomPointNearLocalPlayer();
    bot.targetUntil = Date.now() + 4500;
  }
}

function moveLocalSnake(snake, speed) {
  snake.angle = rotateToward(snake.angle, snake.targetAngle, Math.PI / 16);
  const head = snake.segments[0];
  const next = {
    x: head.x + Math.cos(snake.angle) * speed,
    y: head.y + Math.sin(snake.angle) * speed,
    renderX: head.renderX,
    renderY: head.renderY
  };
  snake.segments.unshift(next);
  snake.segments.pop();
  return next;
}

function killLocalSnake(id, by) {
  const snake = state.snakes[id];
  if (!snake || !snake.alive) return;
  snake.alive = false;
  for (let i = 0; i < snake.segments.length; i += 2) {
    handleCollisionInteractionSpawnFoodAt(state, snake.segments[i].x, snake.segments[i].y, 1, 2.5 + Math.random() * 1.8, snake.color, FOOD_COLORS);
  }
  if (id === state.selfId) endGame(by);
  if (isLocalBotId(id)) {
    delete state.snakes[id];
    ensureLocalBotPopulation();
  }
}

function checkLocalSnakeCollisions() {
  const aliveIds = Object.keys(state.snakes).filter(id => state.snakes[id].alive);
  for (let i = 0; i < aliveIds.length; i++) {
    const id = aliveIds[i];
    const snake = state.snakes[id];
    const head = snake.segments[0];
    const radius = snakeRadius(snake);
    if (!isInsideArena(head.x, head.y, state.mapSize, radius)) {
      killLocalSnake(id, 'Wall');
      continue;
    }

    for (let j = 0; j < aliveIds.length; j++) {
      const otherId = aliveIds[j];
      if (id === otherId) continue;
      const other = state.snakes[otherId];
      if (!other || !other.alive) continue;
      const otherRadius = snakeRadius(other);
      for (let k = 0; k < other.segments.length; k++) {
        const segment = other.segments[k];
        const dx = head.x - segment.x;
        const dy = head.y - segment.y;
        const hitRadius = radius + otherRadius;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          killLocalSnake(id, other.name);
          if (k === 0 && snake.segments.length > other.segments.length) {
            killLocalSnake(otherId, snake.name);
          }
          break;
        }
      }
      if (!snake.alive) break;
    }
  }
}

function updateLocalLeaderboard() {
  if (!localMode) return;
  state.leaderboard = Object.values(state.snakes)
    .filter(snake => snake.alive)
    .sort((a, b) => b.segments.length - a.segments.length)
    .slice(0, 10)
    .map(snake => ({
      id: snake.id,
      name: snake.name,
      length: snake.segments.length
    }));
}

function checkLocalEating() {
  for (const id in state.snakes) {
    const snake = state.snakes[id];
    if (!snake.alive || !snake.segments.length) continue;
    const head = snake.segments[0];
    const radius = snakeRadius(snake);
    
    for (let i = state.food.length - 1; i >= 0; i--) {
      const food = state.food[i];
      const dx = head.x - food.x;
      const dy = head.y - food.y;
      const radSum = radius + food.radius;
      
      if (dx * dx + dy * dy < radSum * radSum) {
        // Eat locally!
        state.food.splice(i, 1);
        
        // Notify server that this snake ate food
        if (!localMode && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'eat', snakeId: id, value: food.value }));
        } else if (localMode) {
          // If offline mode, grow local snake immediately
          const tail = snake.segments[snake.segments.length - 1];
          snake.segments.push({ x: tail.x, y: tail.y, renderX: tail.renderX, renderY: tail.renderY });
        }
        
        // Spawn a replacement food safely
        handleCollisionInteractionSpawnFoodRandomly(state, 1, randomArenaPoint, snakeRadius, FOOD_COLORS);
        break;
      }
    }
  }
}

function startLocalFallback() {
  localMode = true;
  initNebulae(state.mapSize);
  const color = state.theme.snake;
  // Spawn player near the center of the expanded map
  const centerPos = state.mapSize / 2;
  localBotCounter = 0;
  localSnake = createLocalSnake('local', nameInput.value || 'Player', centerPos, centerPos, color, selectedTheme, false);
  state.selfId = 'local';
  state.snakes = { local: localSnake };
  state.food = [];
  ensureLocalBotPopulation();
  // Spawn 2000 safe varying size food in offline mode
  handleCollisionInteractionSpawnFoodRandomly(state, 2000, randomArenaPoint, snakeRadius, FOOD_COLORS);
  showGameScreen(lobby, canvas);
}

function connect(urlIndex = 0) {
  localMode = false;
  socket = new WebSocket(SERVER_URLS[urlIndex]);
  socket.onopen = function () {
    socket.send(JSON.stringify({ type: 'join', name: nameInput.value.slice(0, 16) || 'Player', theme: selectedTheme }));
  };
  socket.onmessage = function (event) {
    const message = JSON.parse(event.data);
    if (message.type === 'init') {
      state.selfId = message.selfId;
      state.mapSize = message.mapSize;
      initNebulae(state.mapSize);
      state.snakes = {};
      for (let i = 0; i < message.snakes.length; i++) prepareSnake(message.snakes[i]);
      state.food = [];
      handleCollisionInteractionSpawnFoodRandomly(state, 4000, randomArenaPoint, snakeRadius, FOOD_COLORS);
      state.theme = THEMES[selectedTheme] || THEMES.classic;
      showGameScreen(lobby, canvas);
    }
    if (message.type === 'delta') applyDelta(message);
    if (message.type === 'scores') state.leaderboard = message.leaderboard;
    if (message.type === 'killed') endGame(message.by || 'Unknown');
  };
  socket.onerror = function () {
    if (urlIndex + 1 < SERVER_URLS.length) {
      connect(urlIndex + 1);
      return;
    }
    startLocalFallback();
  };
}

function prepareSnake(snake) {
  for (let i = 0; i < snake.segments.length; i++) {
    snake.segments[i].renderX = snake.segments[i].x;
    snake.segments[i].renderY = snake.segments[i].y;
  }
  snake.renderX = snake.segments[0] ? snake.segments[0].x : 0;
  snake.renderY = snake.segments[0] ? snake.segments[0].y : 0;
  state.snakes[snake.id] = snake;
}

function applyDelta(message) {
  if (Array.isArray(message.snakes)) {
    for (let i = 0; i < message.snakes.length; i++) {
      const snapshot = message.snakes[i];
      const snake = state.snakes[snapshot.id];
      if (!snake || !snake.alive) {
        prepareSnake(snapshot);
      } else {
        snake.name = snapshot.name;
        snake.color = snapshot.color;
        snake.theme = snapshot.theme;
        snake.alive = snapshot.alive;
      }
    }
  }

  for (let i = 0; i < message.moved.length; i++) {
    const item = message.moved[i];
    const snake = state.snakes[item.id];
    if (!snake) continue;
    snake.angle = item.angle;
    snake.boost = item.boost;
    
    // Spawn local boost food trail matching snake color every 8 ticks
    if (snake.boost && snake.segments.length > 12) {
      if (!snake.boostCounter) snake.boostCounter = 0;
      snake.boostCounter++;
      if (snake.boostCounter >= 8) {
        snake.boostCounter = 0;
        const tail = snake.segments[snake.segments.length - 1];
        if (tail) {
          handleCollisionInteractionSpawnFoodAt(state, tail.x, tail.y, 1, 2.4 + Math.random() * 0.6, snake.color, FOOD_COLORS);
        }
      }
    } else {
      snake.boostCounter = 0;
    }
    
    const oldHead = snake.segments[0] || item.head;
    item.head.renderX = oldHead.renderX == null ? oldHead.x : oldHead.renderX;
    item.head.renderY = oldHead.renderY == null ? oldHead.y : oldHead.renderY;
    snake.segments.unshift(item.head);
    if (!item.grow) snake.segments.pop();
    const shrink = item.shrink || 0;
    for (let j = 0; j < shrink && snake.segments.length > 12; j++) {
      snake.segments.pop();
    }
  }
  for (let i = 0; i < message.died.length; i++) {
    const diedId = message.died[i];
    const snake = state.snakes[diedId];
    if (snake) {
      snake.alive = false;
      // Explode dead snake into beautiful colored food dots along its body segments!
      for (let j = 0; j < snake.segments.length; j += 2) {
        handleCollisionInteractionSpawnFoodAt(state, snake.segments[j].x, snake.segments[j].y, 1, 2.5 + Math.random() * 1.8, snake.color, FOOD_COLORS);
      }
    }
  }
}

function updateLocal() {
  if (!localSnake || !localSnake.alive) return;
  
  const canBoost = localSnake.boost && localSnake.segments.length > 12;
  localSnake.speed = canBoost ? 5.0 : 3.0;
  moveLocalSnake(localSnake, localSnake.speed);

  if (canBoost) {
    if (!localSnake.boostCounter) localSnake.boostCounter = 0;
    localSnake.boostCounter++;
    if (localSnake.boostCounter >= 8) {
      localSnake.boostCounter = 0;
      const tail = localSnake.segments.pop();
      if (tail) {
        state.food.push({
          id: 'lf-boost-' + Date.now() + '-' + Math.random(),
          x: tail.x,
          y: tail.y,
          color: localSnake.color,
          value: 1,
          radius: 2.4 + Math.random() * 0.6 // Drops small food in local mode too!
        });
        handleCollisionInteractionBuildFoodGroups(state);
      }
    }
  } else {
    localSnake.boostCounter = 0;
  }

  for (const id in state.snakes) {
    const snake = state.snakes[id];
    if (!snake.alive || !snake.isBot) continue;
    chooseLocalBotTarget(snake);
    snake.targetAngle = Math.atan2(snake.target.y - snake.segments[0].y, snake.target.x - snake.segments[0].x);
    moveLocalSnake(snake, snake.speed);
  }

  checkLocalSnakeCollisions();
  ensureLocalBotPopulation();
  updateLocalLeaderboard();
}

function endGame(by) {
  const player = state.snakes[state.selfId];
  const score = player ? player.segments.length : 0;
  const best = loadHighScore();
  
  finalScoreText.innerHTML = 'Your final length was <strong>' + score + '</strong>';
  deathScoreContainer.classList.remove('hidden');
  
  playButton.textContent = 'Play Again';
  
  if (score > best) {
    saveHighScore(score);
  }
  updateHighestScore(highestScoreText, loadHighScore());
  showGameOverScreen(lobby, canvas);
}

function loop() {
  if (localMode) updateLocal();
  checkLocalEating();
  renderer.draw(state);
  requestAnimationFrame(loop);
}

window.addEventListener('resize', renderer.resize.bind(renderer));

let isBoosting = false;

function updateBoostState() {
  if (localSnake) {
    localSnake.boost = isBoosting;
  }
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'input', boost: isBoosting }));
  }
}

window.addEventListener('mousedown', function (event) {
  if (event.button === 0) { // Left click
    isBoosting = true;
    updateBoostState();
  }
});

window.addEventListener('mouseup', function (event) {
  if (event.button === 0) { // Left click
    isBoosting = false;
    updateBoostState();
  }
});

window.addEventListener('mousemove', function (event) {
  const now = performance.now();
  const angle = Math.atan2(event.clientY - renderer.centerY, event.clientX - renderer.centerX);
  if (localSnake) localSnake.targetAngle = angle;
  if (socket && socket.readyState === WebSocket.OPEN && now - lastInputAt >= 16) {
    socket.send(JSON.stringify({ type: 'input', angle: angle, boost: isBoosting }));
    lastInputAt = now;
  }
});
// Open skin selector screen
skinSelectorBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  lobbyMainUi.classList.add('hidden');
  skinSelectorUi.classList.remove('hidden');
  startSkinPreviewLoop();
});

// Navigation Arrow Clicks
skinPrevBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  let index = THEME_KEYS.indexOf(selectedTheme);
  index = (index - 1 + THEME_KEYS.length) % THEME_KEYS.length;
  selectedTheme = THEME_KEYS[index];
});

skinNextBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  let index = THEME_KEYS.indexOf(selectedTheme);
  index = (index + 1) % THEME_KEYS.length;
  selectedTheme = THEME_KEYS[index];
});

// Save and Close
skinSaveBtn.addEventListener('click', function (e) {
  e.stopPropagation();
  saveSelectedTheme(selectedTheme);
  state.theme = THEMES[selectedTheme] || THEMES.classic;
  
  stopSkinPreviewLoop();
  skinSelectorUi.classList.add('hidden');
  lobbyMainUi.classList.remove('hidden');
});

playButton.addEventListener('click', function () {
  state.theme = THEMES[selectedTheme] || THEMES.classic;
  handleGameRestartResetUi(deathScoreContainer, playButton);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'respawn', theme: selectedTheme }));
    showGameScreen(lobby, canvas);
  } else {
    connect();
  }
  if (!animationStarted) {
    animationStarted = true;
    requestAnimationFrame(loop);
  }
});

function startSkinPreviewLoop() {
  if (previewAnimId) cancelAnimationFrame(previewAnimId);
  
  function tick() {
    animateSkinPreview();
    previewAnimId = requestAnimationFrame(tick);
  }
  previewAnimId = requestAnimationFrame(tick);
}

function stopSkinPreviewLoop() {
  if (previewAnimId) {
    cancelAnimationFrame(previewAnimId);
    previewAnimId = null;
  }
}

function animateSkinPreview() {
  if (skinSelectorUi.classList.contains('hidden')) return;
  
  const ctx = previewCtx;
  if (!ctx) return;
  const w = previewCanvas.width;
  const h = previewCanvas.height;
  
  ctx.clearRect(0, 0, w, h);
  
  previewSnake.theme = selectedTheme;
  previewSnake.color = THEMES[selectedTheme].snake;
  previewSnake.name = (nameInput.value || 'Player').slice(0, 16);
  
  const time = Date.now() * 0.007;
  previewSnake.segments = [];
  for (let i = 0; i < 18; i++) {
    const segX = 300 + (8 - i) * 16;
    const segY = h / 2 + Math.sin(time - i * 0.32) * 18;
    previewSnake.segments.push({
      x: segX,
      y: segY,
      renderX: segX,
      renderY: segY
    });
  }
  
  const dx = previewSnake.segments[0].x - previewSnake.segments[1].x;
  const dy = previewSnake.segments[0].y - previewSnake.segments[1].y;
  previewSnake.angle = Math.atan2(dy, dx);
  
  const radius = 12;
  
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  let strokeStyle = previewSnake.color;
  const head = previewSnake.segments[0];
  const tail = previewSnake.segments[previewSnake.segments.length - 1];
  
  if (selectedTheme === 'rainbow' || selectedTheme === 'sunset') {
    const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    if (selectedTheme === 'rainbow') {
      grad.addColorStop(0, '#ff4b5c');
      grad.addColorStop(0.2, '#ffb84d');
      grad.addColorStop(0.4, '#c9e75b');
      grad.addColorStop(0.6, '#06b6d4');
      grad.addColorStop(0.8, '#8b5cf6');
      grad.addColorStop(1, '#ff4b5c');
    } else {
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(0.5, '#ec4899');
      grad.addColorStop(1, '#8b5cf6');
    }
    strokeStyle = grad;
  } else if (selectedTheme === 'raccoon') {
    const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    for (let i = 0; i <= 10; i++) {
      grad.addColorStop(i / 10, i % 2 === 0 ? '#4b5563' : '#1f2937');
    }
    strokeStyle = grad;
  } else if (selectedTheme === 'bear') {
    const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    for (let i = 0; i <= 10; i++) {
      grad.addColorStop(i / 10, i % 2 === 0 ? '#78350f' : '#b45309');
    }
    strokeStyle = grad;
  } else if (selectedTheme === 'rabbit') {
    const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    for (let i = 0; i <= 10; i++) {
      grad.addColorStop(i / 10, i % 2 === 0 ? '#f3f4f6' : '#fae8ff');
    }
    strokeStyle = grad;
  }
  
  ctx.strokeStyle = strokeStyle;
  ctx.globalAlpha = 0.38;
  ctx.lineWidth = radius * 2.5;
  ctx.beginPath();
  ctx.moveTo(previewSnake.segments[0].x, previewSnake.segments[0].y);
  for (let i = 1; i < previewSnake.segments.length; i++) {
    ctx.lineTo(previewSnake.segments[i].x, previewSnake.segments[i].y);
  }
  ctx.stroke();
  
  ctx.globalAlpha = 1.0;
  ctx.lineWidth = radius * 2.0;
  ctx.strokeStyle = strokeStyle;
  ctx.beginPath();
  ctx.moveTo(previewSnake.segments[0].x, previewSnake.segments[0].y);
  for (let i = 1; i < previewSnake.segments.length; i++) {
    ctx.lineTo(previewSnake.segments[i].x, previewSnake.segments[i].y);
  }
  ctx.stroke();
  ctx.restore();
  
  if (selectedTheme === 'raccoon' || selectedTheme === 'bear' || selectedTheme === 'rabbit') {
    renderer.drawTail(ctx, previewSnake, radius);
  }
  
  renderer.drawHead(ctx, previewSnake, radius * 1.25);
  renderer.drawSnakeName(ctx, previewSnake, radius);
}
renderer.resize();
showStartScreen(lobby, canvas);
