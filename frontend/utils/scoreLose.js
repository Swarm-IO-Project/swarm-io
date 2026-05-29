export function handleScoreLoseLoadHighScore(key = 'slither_highscore') {
  return Number(localStorage.getItem(key) || '0');
}

export function handleScoreLoseSaveHighScore(score, key = 'slither_highscore') {
  localStorage.setItem(key, String(score));
}

export function handleScoreLoseLoadSelectedTheme(key = 'slither_theme') {
  return localStorage.getItem(key) || 'classic';
}

export function handleScoreLoseSaveSelectedTheme(theme, key = 'slither_theme') {
  localStorage.setItem(key, theme);
}

export function handleScoreLoseUpdateHighestScore(element, score) {
  if (!element) return;
  element.textContent = 'Highest Score: ' + Number(score || 0);
}

export const loadHighScore = handleScoreLoseLoadHighScore;
export const saveHighScore = handleScoreLoseSaveHighScore;
export const loadSelectedTheme = handleScoreLoseLoadSelectedTheme;
export const saveSelectedTheme = handleScoreLoseSaveSelectedTheme;
export const updateHighestScore = handleScoreLoseUpdateHighestScore;