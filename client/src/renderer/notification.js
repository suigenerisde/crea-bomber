/**
 * CreaBomber Notification Renderer
 * Handles notification display, interactions, and media content
 * with preloading and embedded video support
 */

// ============================================================
// MEDIA PRELOADER CLASS
// ============================================================

/**
 * MediaPreloader - Preloads all media assets before showing notification
 * Supports images, video thumbnails, and audio files
 */
class MediaPreloader {
  constructor(options = {}) {
    this.timeout = options.timeout || 10000; // 10 second max wait
    this.preloadedAssets = new Map();
  }

  /**
   * Preload an image
   */
  preloadImage(url) {
    return new Promise((resolve, reject) => {
      if (!url) {
        resolve(null);
        return;
      }

      // Check cache
      if (this.preloadedAssets.has(url)) {
        resolve(this.preloadedAssets.get(url));
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.preloadedAssets.set(url, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Preload audio (just metadata, not full file)
   */
  preloadAudio(url) {
    return new Promise((resolve, reject) => {
      if (!url) {
        resolve(null);
        return;
      }

      const audio = new Audio();
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        this.preloadedAssets.set(url, audio);
        resolve(audio);
      };
      audio.onerror = () => reject(new Error(`Failed to load audio: ${url}`));
      audio.src = url;
    });
  }

  /**
   * Preconnect to video embed domains for faster iframe loading
   */
  preconnectVideoHost(videoUrl) {
    const hosts = [];

    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      hosts.push('https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://i.ytimg.com');
    } else if (videoUrl.includes('loom.com')) {
      hosts.push('https://www.loom.com', 'https://cdn.loom.com');
    } else if (videoUrl.includes('vimeo.com')) {
      hosts.push('https://player.vimeo.com', 'https://i.vimeocdn.com');
    }

    hosts.forEach(host => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = host;
      document.head.appendChild(link);
    });

    return Promise.resolve();
  }

  /**
   * Preload all assets for a payload
   */
  async preloadAll(payload) {
    const tasks = [];

    switch (payload.type) {
      case 'TEXT_IMAGE':
        if (payload.imageUrl) {
          tasks.push(this.preloadImage(payload.imageUrl).catch(() => null));
        }
        break;

      case 'VIDEO':
        if (payload.videoUrl) {
          // Preconnect to video host
          tasks.push(this.preconnectVideoHost(payload.videoUrl));
          // Also preload thumbnail
          const thumbUrl = getThumbnailUrl(payload.videoUrl);
          if (thumbUrl) {
            tasks.push(this.preloadImage(thumbUrl).catch(() => null));
          }
        }
        break;

      case 'AUDIO':
        if (payload.audioUrl) {
          tasks.push(this.preloadAudio(payload.audioUrl).catch(() => null));
        }
        break;
    }

    // Wait for all with timeout
    return Promise.race([
      Promise.all(tasks),
      new Promise(resolve => setTimeout(() => resolve([]), this.timeout))
    ]);
  }

  /**
   * Get preloaded asset
   */
  getAsset(url) {
    return this.preloadedAssets.get(url);
  }

  /**
   * Clear cache
   */
  clear() {
    this.preloadedAssets.clear();
  }
}

// ============================================================
// VIDEO EMBEDDER CLASS
// ============================================================

/**
 * VideoEmbedder - Creates embedded video players for YouTube, Loom, Vimeo
 */
class VideoEmbedder {
  constructor(options = {}) {
    this.autoplay = options.autoplay || false;
    this.muted = options.muted !== false; // Default muted for autoplay
  }

  /**
   * Get YouTube video ID from URL
   */
  getYouTubeId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^?\s]+)/,
      /youtube\.com\/v\/([^?\s]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Get Loom video ID from URL
   */
  getLoomId(url) {
    if (!url) return null;
    const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get Vimeo video ID from URL
   */
  getVimeoId(url) {
    if (!url) return null;
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Detect video platform
   */
  detectPlatform(url) {
    if (this.getYouTubeId(url)) return 'youtube';
    if (this.getLoomId(url)) return 'loom';
    if (this.getVimeoId(url)) return 'vimeo';
    return 'unknown';
  }

  /**
   * Create YouTube embed iframe
   */
  createYouTubeEmbed(videoId, autoplay = false) {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      mute: this.muted ? '1' : '0',
      rel: '0',
      modestbranding: '1',
      playsinline: '1'
    });

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;

    return iframe;
  }

  /**
   * Create Loom embed iframe
   */
  createLoomEmbed(videoId, autoplay = false) {
    const params = new URLSearchParams({
      hide_owner: 'true',
      hide_share: 'true',
      hide_title: 'true'
    });

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.loom.com/embed/${videoId}?${params}`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allow = 'autoplay; fullscreen';
    iframe.allowFullscreen = true;

    return iframe;
  }

  /**
   * Create Vimeo embed iframe
   */
  createVimeoEmbed(videoId, autoplay = false) {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      muted: this.muted ? '1' : '0',
      title: '0',
      byline: '0',
      portrait: '0'
    });

    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${videoId}?${params}`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;

    return iframe;
  }

  /**
   * Create embedded video element
   */
  createEmbed(url, autoplay = false) {
    const platform = this.detectPlatform(url);

    switch (platform) {
      case 'youtube':
        return this.createYouTubeEmbed(this.getYouTubeId(url), autoplay);
      case 'loom':
        return this.createLoomEmbed(this.getLoomId(url), autoplay);
      case 'vimeo':
        return this.createVimeoEmbed(this.getVimeoId(url), autoplay);
      default:
        return null;
    }
  }

  /**
   * Check if URL can be embedded
   */
  canEmbed(url) {
    return this.detectPlatform(url) !== 'unknown';
  }
}

// ============================================================
// DOM ELEMENTS
// ============================================================

const notification = document.getElementById('notification');
const preloadOverlay = document.getElementById('preload-overlay');
const textContent = document.getElementById('text-content');
const imageContainer = document.getElementById('image-container');
const imageLoading = document.getElementById('image-loading');
const imageContent = document.getElementById('image-content');
const videoContainer = document.getElementById('video-container');
const videoThumbnail = document.getElementById('video-thumbnail');
const videoThumbImg = document.getElementById('video-thumb-img');
const videoEmbedContainer = document.getElementById('video-embed-container');
const audioContainer = document.getElementById('audio-container');
const audioWaveform = document.getElementById('audio-waveform');
const audioAutoplayBadge = document.getElementById('audio-autoplay-badge');
const audioPlayer = document.getElementById('audio-player');
const timestamp = document.getElementById('timestamp');
const closeBtn = document.getElementById('close-btn');
const progressBar = document.getElementById('progress-bar');

// ============================================================
// INSTANCES
// ============================================================

const mediaPreloader = new MediaPreloader({ timeout: 10000 });
const videoEmbedder = new VideoEmbedder({ muted: true });

// ============================================================
// STATE
// ============================================================

let currentPayload = null;
let progressInterval = null;
let startTime = null;
let duration = 0;
let isVideoEmbedded = false;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format timestamp to "h:mm a" format
 */
function formatTime(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Get YouTube video ID from URL
 */
function getYouTubeVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
    /youtube\.com\/v\/([^?\s]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get Loom video ID from URL
 */
function getLoomVideoId(url) {
  if (!url) return null;
  const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Get Vimeo video ID from URL
 */
function getVimeoVideoId(url) {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Get video thumbnail URL
 * Uses high-quality thumbnail for YouTube (maxresdefault with fallback to hqdefault)
 */
function getThumbnailUrl(videoUrl) {
  // YouTube - use maxresdefault for high quality
  const youtubeId = getYouTubeVideoId(videoUrl);
  if (youtubeId) {
    // maxresdefault gives 1280x720, hqdefault gives 480x360
    return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
  }

  // Loom - use placeholder since Loom thumbnails require API
  const loomId = getLoomVideoId(videoUrl);
  if (loomId) {
    return `https://cdn.loom.com/sessions/thumbnails/${loomId}-with-play.gif`;
  }

  // Vimeo - use placeholder since Vimeo thumbnails require API
  const vimeoId = getVimeoVideoId(videoUrl);
  if (vimeoId) {
    return null;
  }

  return null;
}

/**
 * Get fallback thumbnail URL (lower quality)
 */
function getFallbackThumbnailUrl(videoUrl) {
  const youtubeId = getYouTubeVideoId(videoUrl);
  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }
  return null;
}

/**
 * Open video URL in default browser
 */
function openVideoUrl(url) {
  if (url) {
    window.open(url, '_blank');
  }
}

/**
 * Generate waveform bars
 */
function generateWaveform() {
  audioWaveform.innerHTML = '';
  const barCount = 30;

  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('div');
    bar.className = 'audio-bar';
    const height = Math.random() * 100;
    bar.style.height = `${Math.max(height, 15)}%`;
    audioWaveform.appendChild(bar);
  }
}

/**
 * Start progress bar countdown
 */
function startProgress(totalDuration) {
  duration = totalDuration;
  startTime = Date.now();

  if (progressInterval) {
    clearInterval(progressInterval);
  }

  progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    const progress = remaining / duration;

    progressBar.style.transform = `scaleX(${progress})`;

    if (remaining <= 0) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }, 100);
}

/**
 * Stop progress bar
 */
function stopProgress() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

/**
 * Render text with proper line breaks
 */
function renderText(text) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return escaped.replace(/\n/g, '<br>');
}

/**
 * Create video placeholder SVG
 */
function createVideoPlaceholder(text = 'Video') {
  const svg = `<svg width="320" height="128" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1e293b"/>
    <circle cx="160" cy="55" r="24" fill="rgba(59, 130, 246, 0.2)"/>
    <polygon points="155,45 155,65 170,55" fill="#60a5fa"/>
    <text x="50%" y="100" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12">${text}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ============================================================
// PRELOAD OVERLAY
// ============================================================

function showPreloadOverlay() {
  if (preloadOverlay) {
    preloadOverlay.classList.remove('hidden');
  }
}

function hidePreloadOverlay() {
  if (preloadOverlay) {
    preloadOverlay.classList.add('hidden');
  }
}

// ============================================================
// RESET FUNCTIONS
// ============================================================

/**
 * Reset all content areas
 */
function resetContent() {
  // Hide all content containers
  imageContainer.classList.add('hidden');
  videoContainer.classList.add('hidden');
  audioContainer.classList.add('hidden');
  hidePreloadOverlay();

  // Reset text
  textContent.innerHTML = '';

  // Reset image
  if (!imageContainer.querySelector('.notification-image')) {
    imageContainer.innerHTML = `
      <div id="image-loading" class="loading-indicator">
        <div class="loading-spinner"></div>
      </div>
      <img id="image-content" class="notification-image" alt="Notification image">
    `;
    window.imageLoading = document.getElementById('image-loading');
    window.imageContent = document.getElementById('image-content');
  }
  imageContent.src = '';
  imageContent.classList.remove('loaded');
  imageContent.classList.add('loading');
  imageLoading.classList.remove('hidden');

  // Reset video - clear embed if exists
  if (videoEmbedContainer) {
    videoEmbedContainer.innerHTML = '';
    videoEmbedContainer.classList.add('hidden');
  }
  videoThumbnail.classList.remove('hidden');
  videoThumbImg.src = '';
  videoThumbImg.classList.remove('loading');
  isVideoEmbedded = false;

  // Reset audio
  audioPlayer.pause();
  audioPlayer.src = '';
  audioPlayer.oncanplaythrough = null;
  audioPlayer.onerror = null;
  audioPlayer.onplay = null;
  audioPlayer.onpause = null;
  audioPlayer.onended = null;
  audioAutoplayBadge.classList.add('hidden');

  const audioLabel = audioContainer.querySelector('.audio-label');
  if (audioLabel) {
    audioLabel.textContent = 'Audio message';
  }

  const audioIcon = audioContainer.querySelector('.audio-icon');
  if (audioIcon) {
    audioIcon.style.background = '';
    const svg = audioIcon.querySelector('svg');
    if (svg) svg.style.color = '';
  }

  const bars = audioWaveform.querySelectorAll('.audio-bar');
  bars.forEach(bar => {
    bar.style.background = '';
    bar.classList.remove('animated');
  });

  audioContainer.onclick = null;
  audioContainer.style.cursor = '';

  // Reset progress
  stopProgress();
  progressBar.style.transform = 'scaleX(1)';

  // Clear preloader cache
  mediaPreloader.clear();

  currentPayload = null;
}

// ============================================================
// SHOW NOTIFICATION
// ============================================================

/**
 * Show notification with payload (with preloading)
 */
async function showNotification(payload) {
  console.log('[Renderer] Showing notification:', payload);

  // Reset previous content
  resetContent();

  // Store current payload
  currentPayload = payload;

  // Show preload overlay for media types
  if (payload.type !== 'TEXT') {
    showPreloadOverlay();
  }

  // Preload all assets
  try {
    await mediaPreloader.preloadAll(payload);
    console.log('[Renderer] Media preloaded successfully');
  } catch (err) {
    console.warn('[Renderer] Preload failed:', err);
  }

  // Hide preload overlay
  hidePreloadOverlay();

  // Set timestamp
  timestamp.textContent = formatTime(new Date());

  // Set text content
  if (payload.content) {
    textContent.innerHTML = renderText(payload.content);
  } else {
    textContent.innerHTML = '';
  }

  // Handle different message types
  switch (payload.type) {
    case 'TEXT':
      break;

    case 'TEXT_IMAGE':
      if (payload.imageUrl) {
        showImage(payload.imageUrl);
      }
      break;

    case 'VIDEO':
      if (payload.videoUrl) {
        showVideo(payload.videoUrl, payload.videoAutoplay);
      }
      break;

    case 'AUDIO':
      if (payload.audioUrl) {
        showAudio(payload.audioUrl, payload.audioAutoplay);
      }
      break;
  }

  // Show notification with animation
  notification.classList.remove('hidden', 'hiding');
  void notification.offsetWidth;
  notification.classList.add('visible', 'animate-in');

  // Request appropriate window size
  requestWindowResize(payload.type);

  // Signal main process that preload is complete and window can be shown
  if (window.creaBomber && window.creaBomber.notifyPreloadComplete) {
    window.creaBomber.notifyPreloadComplete();
  }
}

/**
 * Hide notification
 */
function hideNotification() {
  console.log('[Renderer] Hiding notification');

  notification.classList.remove('visible', 'animate-in');
  notification.classList.add('hiding');

  setTimeout(() => {
    notification.classList.add('hidden');
    notification.classList.remove('hiding');
    resetContent();
  }, 300);
}

// ============================================================
// CONTENT DISPLAY FUNCTIONS
// ============================================================

/**
 * Show image content
 */
function showImage(imageUrl) {
  imageContainer.classList.remove('hidden');

  // Check if preloaded
  const preloadedImg = mediaPreloader.getAsset(imageUrl);

  if (preloadedImg) {
    imageLoading.classList.add('hidden');
    imageContent.src = imageUrl;
    imageContent.classList.remove('loading');
    imageContent.classList.add('loaded');
    console.log('[Renderer] Using preloaded image');
    return;
  }

  // Fallback to loading
  imageLoading.classList.remove('hidden');
  imageContent.classList.add('loading');
  imageContent.classList.remove('loaded');

  const tempImg = new Image();

  tempImg.onload = () => {
    imageLoading.classList.add('hidden');
    imageContent.src = imageUrl;
    imageContent.classList.remove('loading');
    imageContent.classList.add('loaded');
  };

  tempImg.onerror = () => {
    console.error('[Renderer] Failed to load image:', imageUrl);
    imageLoading.classList.add('hidden');
    imageContent.classList.remove('loading');

    imageContainer.innerHTML = `
      <div class="notification-error">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span class="notification-error-text">Failed to load image</span>
      </div>
    `;
  };

  tempImg.src = imageUrl;
}

/**
 * Show video content with embedded player or thumbnail
 * For YouTube: Shows thumbnail, then embeds with muted autoplay on click or immediately if autoplay=true
 */
function showVideo(videoUrl, autoplay = false) {
  videoContainer.classList.remove('hidden');

  // Check if we can embed the video
  if (videoEmbedder.canEmbed(videoUrl)) {
    // Show thumbnail first, click to embed
    const thumbnailUrl = getThumbnailUrl(videoUrl);
    const fallbackUrl = getFallbackThumbnailUrl(videoUrl);

    // Function to load thumbnail with fallback
    const loadThumbnail = () => {
      if (thumbnailUrl) {
        const preloadedThumb = mediaPreloader.getAsset(thumbnailUrl);
        if (preloadedThumb) {
          videoThumbImg.src = thumbnailUrl;
          videoThumbImg.classList.remove('loading');
          console.log('[Renderer] Using preloaded thumbnail');
        } else {
          videoThumbImg.classList.add('loading');
          const tempThumb = new Image();
          tempThumb.onload = () => {
            videoThumbImg.src = thumbnailUrl;
            videoThumbImg.classList.remove('loading');
            console.log('[Renderer] Thumbnail loaded:', thumbnailUrl);
          };
          tempThumb.onerror = () => {
            // Try fallback URL
            if (fallbackUrl && fallbackUrl !== thumbnailUrl) {
              console.log('[Renderer] Trying fallback thumbnail');
              const fallbackThumb = new Image();
              fallbackThumb.onload = () => {
                videoThumbImg.src = fallbackUrl;
                videoThumbImg.classList.remove('loading');
              };
              fallbackThumb.onerror = () => {
                videoThumbImg.src = createVideoPlaceholder('Click to play');
                videoThumbImg.classList.remove('loading');
              };
              fallbackThumb.src = fallbackUrl;
            } else {
              videoThumbImg.src = createVideoPlaceholder('Click to play');
              videoThumbImg.classList.remove('loading');
            }
          };
          tempThumb.src = thumbnailUrl;
        }
      } else {
        videoThumbImg.src = createVideoPlaceholder('Click to play');
        videoThumbImg.classList.remove('loading');
      }
    };

    // Always load thumbnail first
    loadThumbnail();

    // If autoplay, embed immediately (muted autoplay)
    if (autoplay) {
      console.log('[Renderer] Video autoplay enabled, embedding immediately');
      // Small delay to ensure thumbnail is visible before embed
      setTimeout(() => {
        embedVideo(videoUrl, true);
      }, 100);
    } else {
      // Click to embed
      videoThumbnail.onclick = () => {
        embedVideo(videoUrl, true);
      };
    }
  } else {
    // Unknown video type - just show thumbnail and open in browser
    videoThumbImg.src = createVideoPlaceholder('Click to open video');
    videoThumbImg.classList.remove('loading');
    videoThumbnail.onclick = () => {
      openVideoUrl(videoUrl);
    };
  }
}

/**
 * Embed video in iframe
 */
function embedVideo(videoUrl, autoplay = false) {
  if (isVideoEmbedded) return;

  const iframe = videoEmbedder.createEmbed(videoUrl, autoplay);

  if (iframe && videoEmbedContainer) {
    // Hide thumbnail, show embed
    videoThumbnail.classList.add('hidden');
    videoEmbedContainer.classList.remove('hidden');
    videoEmbedContainer.innerHTML = '';
    videoEmbedContainer.appendChild(iframe);
    isVideoEmbedded = true;

    console.log('[Renderer] Video embedded');
  }
}

/**
 * Show audio player
 */
function showAudio(audioUrl, autoplay = false) {
  audioContainer.classList.remove('hidden');
  generateWaveform();

  if (autoplay) {
    audioAutoplayBadge.classList.remove('hidden');
  }

  const audioLabel = audioContainer.querySelector('.audio-label');
  if (audioLabel) {
    audioLabel.textContent = 'Loading audio...';
  }

  // Check if preloaded
  const preloadedAudio = mediaPreloader.getAsset(audioUrl);
  if (preloadedAudio) {
    audioPlayer.src = audioUrl;
    if (audioLabel) {
      audioLabel.textContent = 'Audio message';
    }
    if (autoplay) {
      audioPlayer.play().catch(() => {
        if (audioLabel) audioLabel.textContent = 'Click to play';
      });
    }
  } else {
    audioPlayer.src = audioUrl;
  }

  audioPlayer.oncanplaythrough = () => {
    if (audioLabel) {
      audioLabel.textContent = 'Audio message';
    }
    if (autoplay && !preloadedAudio) {
      audioPlayer.play().catch(err => {
        console.warn('[Renderer] Auto-play blocked:', err);
        if (audioLabel) {
          audioLabel.textContent = 'Click to play';
        }
      });
    }
  };

  audioPlayer.onerror = () => {
    console.error('[Renderer] Failed to load audio:', audioUrl);
    if (audioLabel) {
      audioLabel.textContent = 'Failed to load audio';
    }
    const bars = audioWaveform.querySelectorAll('.audio-bar');
    bars.forEach(bar => {
      bar.style.background = 'rgba(100, 116, 139, 0.3)';
    });
    const audioIcon = audioContainer.querySelector('.audio-icon');
    if (audioIcon) {
      audioIcon.style.background = 'rgba(239, 68, 68, 0.2)';
      const svg = audioIcon.querySelector('svg');
      if (svg) svg.style.color = '#fca5a5';
    }
  };

  audioPlayer.onplay = () => {
    const bars = audioWaveform.querySelectorAll('.audio-bar');
    bars.forEach((bar, i) => {
      bar.classList.add('animated');
      bar.style.animationDelay = `${i * 0.05}s`;
    });
    if (audioLabel) {
      audioLabel.textContent = 'Playing...';
    }
  };

  audioPlayer.onpause = () => {
    const bars = audioWaveform.querySelectorAll('.audio-bar');
    bars.forEach(bar => bar.classList.remove('animated'));
    if (audioLabel && !audioPlayer.error) {
      audioLabel.textContent = 'Audio message';
    }
  };

  audioPlayer.onended = () => {
    const bars = audioWaveform.querySelectorAll('.audio-bar');
    bars.forEach(bar => bar.classList.remove('animated'));
    if (audioLabel) {
      audioLabel.textContent = 'Finished';
    }
  };

  audioContainer.onclick = (e) => {
    if (audioPlayer.error) {
      console.warn('[Renderer] Cannot play - audio failed to load');
      return;
    }

    if (e.target === audioContainer || e.target.closest('.audio-icon') || e.target.closest('.audio-waveform')) {
      if (audioPlayer.paused) {
        audioPlayer.play().catch((err) => {
          console.warn('[Renderer] Play failed:', err);
        });
      } else {
        audioPlayer.pause();
      }
    }
  };
  audioContainer.style.cursor = 'pointer';
}

/**
 * Request window resize based on content type
 */
function requestWindowResize(type) {
  if (!window.creaBomber) return;

  const sizes = {
    'TEXT': { width: 450, height: 200 },
    'TEXT_IMAGE': { width: 600, height: 550 },
    'VIDEO': { width: 600, height: 500 },
    'AUDIO': { width: 450, height: 250 }
  };

  const size = sizes[type] || sizes['TEXT'];
  window.creaBomber.requestResize(size.width, size.height);
}

// ============================================================
// INITIALIZATION
// ============================================================

function init() {
  console.log('[Renderer] Initializing notification renderer with media preloading...');

  closeBtn.addEventListener('click', () => {
    if (window.creaBomber) {
      window.creaBomber.closeNotification();
    }
  });

  if (window.creaBomber) {
    window.creaBomber.onNotification((payload) => {
      showNotification(payload);
    });

    window.creaBomber.onHide(() => {
      hideNotification();
    });

    console.log('[Renderer] Subscribed to notification events');
  } else {
    console.warn('[Renderer] creaBomber API not available - running outside Electron?');
    window.showTestNotification = showNotification;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
