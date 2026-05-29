export function loadHighScore(key = 'slither_highscore') {
  return Number(localStorage.getItem(key) || '0');
}

export function saveHighScore(score, key = 'slither_highscore') {
  localStorage.setItem(key, String(score));
}

export function loadSelectedTheme(key = 'slither_theme') {
  return localStorage.getItem(key) || 'classic';
}

export function saveSelectedTheme(theme, key = 'slither_theme') {
  localStorage.setItem(key, theme);
}

export function showScreen(lobby, canvas, name) {
  lobby.classList.toggle('hidden', name !== 'lobby');
  canvas.style.display = name === 'game' ? 'block' : 'none';
}

export function updateHighestScore(element, score) {
  if (!element) return;
  element.textContent = 'Highest Score: ' + Number(score || 0);
}