export function handleCollisionInteractionBuildFoodGroups(state) {
  const foodByColor = {};
  for (let i = 0; i < state.food.length; i++) {
    const food = state.food[i];
    if (!foodByColor[food.color]) foodByColor[food.color] = [];
    foodByColor[food.color].push(food);
  }
  state.foodByColor = foodByColor;
}

export function handleCollisionInteractionSpawnFoodAt(state, x, y, value, radius, color, foodColors) {
  state.food.push({
    id: 'lf-' + Date.now() + '-' + Math.random(),
    x,
    y,
    color: color || foodColors[Math.floor(Math.random() * foodColors.length)],
    value: value || 1,
    radius: radius || 3.0
  });
  handleCollisionInteractionBuildFoodGroups(state);
}

export function handleCollisionInteractionSpawnFoodRandomly(state, count, randomArenaPoint, snakeRadius, foodColors) {
  for (let i = 0; i < count; i++) {
    let x;
    let y;
    let tooClose;
    let attempts = 0;

    do {
      const point = randomArenaPoint(state.mapSize, 120);
      x = point.x;
      y = point.y;
      tooClose = false;
      attempts++;

      for (const id in state.snakes) {
        const snake = state.snakes[id];
        if (!snake.alive) continue;
        const radius = snakeRadius(snake);
        const head = snake.segments[0];
        if (head) {
          for (let j = 0; j < snake.segments.length; j++) {
            const segment = snake.segments[j];
            const dx = x - segment.x;
            const dy = y - segment.y;
            if (dx * dx + dy * dy < radius * radius * 6.25) {
              tooClose = true;
              break;
            }
          }
        }
        if (tooClose) break;
      }
    } while (tooClose && attempts < 10);

    const factor = Math.random();
    const r = 2.2 + factor * factor * 3.3;
    const val = Math.max(1, Math.round(r * 0.45));

    state.food.push({
      id: 'lf-' + Date.now() + '-' + Math.random(),
      x,
      y,
      color: foodColors[Math.floor(Math.random() * foodColors.length)],
      value: val,
      radius: r
    });
  }

  handleCollisionInteractionBuildFoodGroups(state);
}