export function handleGameRestartResetUi(deathScoreContainer, playButton) {
  if (deathScoreContainer) deathScoreContainer.classList.add('hidden');
  if (playButton) playButton.textContent = 'Play';
}
