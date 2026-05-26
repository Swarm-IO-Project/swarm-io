function handleCollisionInteractionIsInsideArena(ARENA_CENTER, ARENA_RADIUS, x, y, padding) {
  const dx = x - ARENA_CENTER;
  const dy = y - ARENA_CENTER;
  const radius = ARENA_RADIUS - padding;
  return dx * dx + dy * dy <= radius * radius;
}

function handleCollisionInteractionCellKey(CELL_SIZE, x, y) {
  return Math.floor(x / CELL_SIZE) + ',' + Math.floor(y / CELL_SIZE);
}

module.exports = {
  handleCollisionInteractionIsInsideArena,
  handleCollisionInteractionCellKey
};