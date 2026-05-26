function handleScoreLoseCleanName(name) {
  return String(name || 'Player').replace(/[<>]/g, '').slice(0, 16) || 'Player';
}

module.exports = {
  handleScoreLoseCleanName
};