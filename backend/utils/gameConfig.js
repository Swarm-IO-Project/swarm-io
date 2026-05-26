const MAP_SIZE = 10000;
const ARENA_CENTER = MAP_SIZE / 2;
const ARENA_RADIUS = MAP_SIZE / 2;
const CELL_SIZE = 50;
const FOOD_RADIUS = 5;
const PLAYER_TURN_STEP = Math.PI / 16;

const THEMES = {
  classic: { snake: '#34d399', food: ['#f87171', '#facc15', '#60a5fa'] },
  neon: { snake: '#22d3ee', food: ['#f0abfc', '#a3e635', '#fb7185'] },
  pastel: { snake: '#f9a8d4', food: ['#bfdbfe', '#bbf7d0', '#fde68a'] },
  ocean: { snake: '#38bdf8', food: ['#99f6e4', '#fef08a', '#c4b5fd'] },
  desert: { snake: '#fb923c', food: ['#fef3c7', '#fdba74', '#bef264'] },
  rainbow: { snake: '#f43f5e', food: ['#f87171', '#facc15', '#60a5fa', '#34d399', '#a855f7'] },
  sunset: { snake: '#ec4899', food: ['#fdba74', '#fb7185', '#a855f7', '#f43f5e'] },
  raccoon: { snake: '#4b5563', food: ['#6b7280', '#e5e7eb', '#374151'] },
  bear: { snake: '#78350f', food: ['#b45309', '#f59e0b', '#d97706'] },
  rabbit: { snake: '#f3f4f6', food: ['#fbcfe8', '#e5e7eb', '#ffffff'] }
};

module.exports = {
  MAP_SIZE,
  ARENA_CENTER,
  ARENA_RADIUS,
  CELL_SIZE,
  FOOD_RADIUS,
  PLAYER_TURN_STEP,
  THEMES
};