(() => {
  'use strict';

  const DEFAULT_BACKGROUND_VIDEO_URL = 'https://github.com/hamodybr/-shorash-assets/raw/refs/heads/main/shorash-bg.MP4';

  window.RESTBR_DEFAULTS = Object.freeze({
    backgroundVideoUrl: DEFAULT_BACKGROUND_VIDEO_URL
  });

  function resolveRestaurantBackgroundVideo() {
    const settings = window.RESTBR_GOLD_FIXTURE?.settings || window.RESTBR_RESTAURANT_SETTINGS || {};
    const restaurantOverride = String(settings.background_video_url || settings.backgroundVideoUrl || '').trim();
    return restaurantOverride || DEFAULT_BACKGROUND_VIDEO_URL;
  }

  function applyRestaurantBackgroundVideo() {
    const video = document.getElementById('smBgVideo');
    if (!video) return;

    const resolvedUrl = resolveRestaurantBackgroundVideo();
    if (!resolvedUrl) return;

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
        // iOS/Safari may defer autoplay in some power/network states.
        // The source stays assigned and will play as soon as the browser allows it.
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyRestaurantBackgroundVideo, { once: true });
  } else {
    applyRestaurantBackgroundVideo();
  }
})();
