function handlePlayerMovementRandomArenaPoint(ARENA_CENTER, ARENA_RADIUS, padding) {
  const radius = Math.sqrt(Math.random()) * (ARENA_RADIUS - padding);
  const angle = Math.random() * Math.PI * 2;
  return {
    x: ARENA_CENTER + Math.cos(angle) * radius,
    y: ARENA_CENTER + Math.sin(angle) * radius
  };
}

function handlePlayerMovementRotateToward(current, target, maxStep) {
  let diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  if (diff > maxStep) diff = maxStep;
  if (diff < -maxStep) diff = -maxStep;
  return current + diff;
}

module.exports = {
  handlePlayerMovementRandomArenaPoint,
  handlePlayerMovementRotateToward
};