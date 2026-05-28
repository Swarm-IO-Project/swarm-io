export function showStartScreen(lobby, canvas) {
  lobby.classList.remove('hidden');
  canvas.style.display = 'none';
}

export function showGameScreen(lobby, canvas) {
  lobby.classList.add('hidden');
  canvas.style.display = 'block';
}

export function showGameOverScreen(lobby, canvas) {
  lobby.classList.remove('hidden');
  canvas.style.display = 'none';
}