function handleGameRestartBuildSnake(SnakeClass, id, name, spawn, theme, THEMES) {
  return new SnakeClass(id, name, spawn.x, spawn.y, (THEMES[theme] || THEMES.classic).snake, theme);
}

module.exports = {
  handleGameRestartBuildSnake
};