/**
 * Video URL Utilities
 * Handles detection and parsing of YouTube and Loom video URLs
 */

export type VideoType = 'youtube' | 'loom' | 'unknown';

/**
 * Detects the video platform from a URL
 */
export function detectVideoType(url: string): VideoType {
  if (!url) return 'unknown';

  const normalizedUrl = url.toLowerCase();

  // YouTube patterns
  if (
    normalizedUrl.includes('youtube.com') ||
    normalizedUrl.includes('youtu.be')
  ) {
    return 'youtube';
  }

  // Loom patterns
  if (normalizedUrl.includes('loom.com')) {
    return 'loom';
  }

  return 'unknown';
}

/**
 * Extracts YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    // Standard watch URL
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&\s]+)/,
    // Short URL
    /youtu\.be\/([^?\s]+)/,
    // Embed URL
    /youtube\.com\/embed\/([^?\s]+)/,
    // Old embed URL
    /youtube\.com\/v\/([^?\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extracts Loom video ID from URL:
 * - https://www.loom.com/share/VIDEO_ID
 * - https://www.loom.com/embed/VIDEO_ID
 */
export function extractLoomId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    // Share URL
    /loom\.com\/share\/([a-zA-Z0-9]+)/,
    // Embed URL
    /loom\.com\/embed\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Returns the proper embed URL for the detected platform
 */
export function getEmbedUrl(url: string): string | null {
  const videoType = detectVideoType(url);

  switch (videoType) {
    case 'youtube': {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return null;
    }
    case 'loom': {
      const videoId = extractLoomId(url);
      if (videoId) {
        return `https://www.loom.com/embed/${videoId}`;
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Returns a thumbnail image URL for the video
 */
export function getThumbnailUrl(url: string): string | null {
  const videoType = detectVideoType(url);

  switch (videoType) {
    case 'youtube': {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        // YouTube provides multiple quality thumbnails
        // maxresdefault.jpg (1280x720) - may not exist for all videos
        // hqdefault.jpg (480x360) - reliable fallback
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
      return null;
    }
    case 'loom': {
      const videoId = extractLoomId(url);
      if (videoId) {
        // Loom thumbnail URL pattern
        return `https://cdn.loom.com/sessions/thumbnails/${videoId}-with-play.gif`;
      }
      return null;
    }
    default:
      return null;
  }
}
