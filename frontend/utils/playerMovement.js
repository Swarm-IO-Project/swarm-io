export const THEME_KEYS = ['classic', 'neon', 'pastel', 'ocean', 'desert', 'rainbow', 'sunset', 'raccoon', 'bear', 'rabbit'];

export const FOOD_COLORS = ['#f87171', '#facc15', '#60a5fa', '#d946ef', '#a7f3d0', '#fb7185', '#34d399', '#a855f7', '#ff8b3d', '#f472b6'];

export function handlePlayerMovementLerp(a, b, t) {
  return a == null ? b : a + (b - a) * t;
}

export function handlePlayerMovementHexToRgba(hex, alpha) {
  const c = (hex || '#ffffff').replace('#', '');
  if (c.length === 3) {
    const r = parseInt(c[0] + c[0], 16);
    const g = parseInt(c[1] + c[1], 16);
    const b = parseInt(c[2] + c[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function handlePlayerMovementSnakeRadius(snake) {
  return 10 + Math.min(snake.segments.length / 35, 1) * 12;
}

export function handlePlayerMovementRandomArenaPoint(mapSize, padding) {
  const center = mapSize / 2;
  const radius = Math.sqrt(Math.random()) * (mapSize / 2 - padding);
  const angle = Math.random() * Math.PI * 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius
  };
}

export function handlePlayerMovementIsInsideArena(x, y, mapSize, padding) {
  const center = mapSize / 2;
  const dx = x - center;
  const dy = y - center;
  const radius = mapSize / 2 - padding;
  return dx * dx + dy * dy <= radius * radius;
}

export function handlePlayerMovementRotateToward(current, target, maxStep) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-maxStep, Math.min(maxStep, diff));
}

export const lerp = handlePlayerMovementLerp;
export const hexToRgba = handlePlayerMovementHexToRgba;
export const snakeRadius = handlePlayerMovementSnakeRadius;
export const randomArenaPoint = handlePlayerMovementRandomArenaPoint;
export const isInsideArena = handlePlayerMovementIsInsideArena;
export const rotateToward = handlePlayerMovementRotateToward;