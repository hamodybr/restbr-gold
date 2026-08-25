import { resolveBackgroundVideoUrl } from '../config/defaults.js';

export function applyRestaurantBackgroundVideo({ settings = {}, documentRef = document } = {}) {
  const video = documentRef.getElementById('smBgVideo');
  if (!video) return null;

  const resolvedUrl = resolveBackgroundVideoUrl(settings);
  if (!resolvedUrl) return null;

  if (video.getAttribute('src') !== resolvedUrl) {
    video.src = resolvedUrl;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.load();
  }

  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === 'function') {
    playAttempt.catch(() => {
      // Safari/iOS may defer autoplay in low-power or constrained-network states.
      // Keeping the canonical source assigned is enough; playback can resume later.
    });
  }

  return resolvedUrl;
}
