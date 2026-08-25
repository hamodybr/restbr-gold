export const DEFAULT_BACKGROUND_VIDEO_URL = 'https://github.com/hamodybr/-shorash-assets/raw/refs/heads/main/shorash-bg.MP4';

export const RESTBR_DEFAULTS = Object.freeze({
  backgroundVideoUrl: DEFAULT_BACKGROUND_VIDEO_URL
});

export function resolveBackgroundVideoUrl(settings = {}) {
  const restaurantOverride = String(
    settings.background_video_url || settings.backgroundVideoUrl || ''
  ).trim();

  return restaurantOverride || DEFAULT_BACKGROUND_VIDEO_URL;
}
