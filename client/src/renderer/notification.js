/**
 * CreaBomber Notification Renderer
 * Handles notification display, interactions, and media content
 */

// DOM Elements
const notification = document.getElementById('notification');
const textContent = document.getElementById('text-content');
const imageContainer = document.getElementById('image-container');
const imageLoading = document.getElementById('image-loading');
const imageContent = document.getElementById('image-content');
const videoContainer = document.getElementById('video-container');
const videoThumbnail = document.getElementById('video-thumbnail');
const videoThumbImg = document.getElementById('video-thumb-img');
const audioContainer = document.getElementById('audio-container');
const audioWaveform = document.getElementById('audio-waveform');
const audioAutoplayBadge = document.getElementById('audio-autoplay-badge');
const audioPlayer = document.getElementById('audio-player');
const timestamp = document.getElementById('timestamp');
const closeBtn = document.getElementById('close-btn');
const progressBar = document.getElementById('progress-bar');

// State
let currentPayload = null;
let progressInterval = null;
let startTime = null;
let duration = 0;

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
 */
function getThumbnailUrl(videoUrl) {
  // YouTube
  const youtubeId = getYouTubeVideoId(videoUrl);
  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  // Loom - use placeholder since Loom thumbnails require API
  const loomId = getLoomVideoId(videoUrl);
  if (loomId) {
    return `https://cdn.loom.com/sessions/thumbnails/${loomId}-with-play.gif`;
  }

  // Vimeo - use placeholder since Vimeo thumbnails require API
  const vimeoId = getVimeoVideoId(videoUrl);
  if (vimeoId) {
    // Vimeo doesn't have a direct thumbnail URL pattern, return null for placeholder
    return null;
  }

  return null;
}

/**
 * Open video URL in default browser
 */
function openVideoUrl(url) {
  if (url) {
    // Use shell.openExternal if available via preload, otherwise window.open
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
    // Random height for visual interest
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

  // Clear any existing interval
  if (progressInterval) {
    clearInterval(progressInterval);
  }

  // Update progress every 100ms
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
 * Reset all content areas
 */
function resetContent() {
  // Hide all content containers
  imageContainer.classList.add('hidden');
  videoContainer.classList.add('hidden');
  audioContainer.classList.add('hidden');

  // Reset text
  textContent.innerHTML = '';

  // Reset image - restore original structure if it was replaced by error
  if (!imageContainer.querySelector('.notification-image')) {
    imageContainer.innerHTML = `
      <div id="image-loading" class="loading-indicator">
        <div class="loading-spinner"></div>
      </div>
      <img id="image-content" class="notification-image" alt="Notification image">
    `;
    // Re-acquire references
    window.imageLoading = document.getElementById('image-loading');
    window.imageContent = document.getElementById('image-content');
  }
  imageContent.src = '';
  imageContent.classList.remove('loaded');
  imageContent.classList.add('loading');
  imageLoading.classList.remove('hidden');

  // Reset video
  videoThumbImg.src = '';
  videoThumbImg.classList.remove('loading');

  // Reset audio - clean up event handlers and state
  audioPlayer.pause();
  audioPlayer.src = '';
  audioPlayer.oncanplaythrough = null;
  audioPlayer.onerror = null;
  audioPlayer.onplay = null;
  audioPlayer.onpause = null;
  audioPlayer.onended = null;
  audioAutoplayBadge.classList.add('hidden');

  // Reset audio label
  const audioLabel = audioContainer.querySelector('.audio-label');
  if (audioLabel) {
    audioLabel.textContent = 'Audio message';
  }

  // Reset audio icon styles (in case of error state)
  const audioIcon = audioContainer.querySelector('.audio-icon');
  if (audioIcon) {
    audioIcon.style.background = '';
    const svg = audioIcon.querySelector('svg');
    if (svg) svg.style.color = '';
  }

  // Reset waveform bar styles
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

  currentPayload = null;
}

/**
 * Render text with proper line breaks
 * Converts \n to <br> while escaping HTML
 */
function renderText(text) {
  if (!text) return '';
  // Escape HTML entities to prevent XSS
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  // Convert line breaks to <br> tags
  return escaped.replace(/\n/g, '<br>');
}

/**
 * Show notification with payload
 */
function showNotification(payload) {
  console.log('[Renderer] Showing notification:', payload);

  // Reset previous content
  resetContent();

  // Store current payload
  currentPayload = payload;

  // Set timestamp
  timestamp.textContent = formatTime(new Date());

  // Set text content with proper line break support
  if (payload.content) {
    textContent.innerHTML = renderText(payload.content);
  } else {
    textContent.innerHTML = '';
  }

  // Handle different message types
  switch (payload.type) {
    case 'TEXT':
      // Text only - nothing extra to show
      break;

    case 'TEXT_IMAGE':
      if (payload.imageUrl) {
        showImage(payload.imageUrl);
      }
      break;

    case 'VIDEO':
      if (payload.videoUrl) {
        showVideo(payload.videoUrl);
      }
      break;

    case 'AUDIO':
      if (payload.audioUrl) {
        showAudio(payload.audioUrl, payload.audioAutoplay);
      }
      break;
  }

  // Calculate duration based on type
  const durations = {
    'TEXT': 8000,
    'TEXT_IMAGE': 12000,
    'VIDEO': 15000,
    'AUDIO': 10000
  };
  const displayDuration = durations[payload.type] || 8000;

  // Start progress bar
  startProgress(displayDuration);

  // Show notification with animation
  notification.classList.remove('hidden', 'hiding');
  // Force reflow for animation
  void notification.offsetWidth;
  notification.classList.add('visible', 'animate-in');

  // Request appropriate window size
  requestWindowResize(payload.type);
}

/**
 * Hide notification
 */
function hideNotification() {
  console.log('[Renderer] Hiding notification');

  notification.classList.remove('visible', 'animate-in');
  notification.classList.add('hiding');

  // After animation, reset
  setTimeout(() => {
    notification.classList.add('hidden');
    notification.classList.remove('hiding');
    resetContent();
  }, 300);
}

/**
 * Show image content with loading state and max dimensions
 */
function showImage(imageUrl) {
  imageContainer.classList.remove('hidden');

  // Show loading state
  imageLoading.classList.remove('hidden');
  imageContent.classList.add('loading');
  imageContent.classList.remove('loaded');

  // Create a new image to preload and check dimensions
  const tempImg = new Image();

  tempImg.onload = () => {
    // Image loaded successfully - update the display
    imageLoading.classList.add('hidden');
    imageContent.src = imageUrl;
    imageContent.classList.remove('loading');
    imageContent.classList.add('loaded');

    console.log('[Renderer] Image loaded:', tempImg.naturalWidth, 'x', tempImg.naturalHeight);
  };

  tempImg.onerror = () => {
    console.error('[Renderer] Failed to load image:', imageUrl);
    imageLoading.classList.add('hidden');
    imageContent.classList.remove('loading');

    // Show error state with icon
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

  // Start loading the image
  tempImg.src = imageUrl;
}

/**
 * Create video placeholder SVG with custom text
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

/**
 * Detect video source type from URL
 */
function getVideoSourceType(url) {
  if (!url) return 'unknown';
  if (getYouTubeVideoId(url)) return 'youtube';
  if (getLoomVideoId(url)) return 'loom';
  if (getVimeoVideoId(url)) return 'vimeo';
  return 'unknown';
}

/**
 * Show video thumbnail with loading state
 */
function showVideo(videoUrl) {
  videoContainer.classList.remove('hidden');

  const sourceType = getVideoSourceType(videoUrl);
  const thumbnailUrl = getThumbnailUrl(videoUrl);

  // Show loading state initially
  videoThumbImg.classList.add('loading');

  if (thumbnailUrl) {
    // Create temp image to preload thumbnail
    const tempThumb = new Image();

    tempThumb.onload = () => {
      videoThumbImg.src = thumbnailUrl;
      videoThumbImg.classList.remove('loading');
      console.log('[Renderer] Video thumbnail loaded for', sourceType);
    };

    tempThumb.onerror = () => {
      console.warn('[Renderer] Thumbnail failed to load, using placeholder');
      // Use a placeholder with source name if thumbnail fails
      const placeholderText = sourceType === 'unknown' ? 'Click to play video' : `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} Video`;
      videoThumbImg.src = createVideoPlaceholder(placeholderText);
      videoThumbImg.classList.remove('loading');
    };

    tempThumb.src = thumbnailUrl;
  } else {
    // Placeholder for unknown video sources
    videoThumbImg.src = createVideoPlaceholder('Click to play video');
    videoThumbImg.classList.remove('loading');
  }

  // Handle click to open video in browser
  videoThumbnail.onclick = () => {
    openVideoUrl(videoUrl);
  };
}

/**
 * Show audio player with loading state and error handling
 */
function showAudio(audioUrl, autoplay = false) {
  audioContainer.classList.remove('hidden');

  // Generate waveform visualization
  generateWaveform();

  // Show autoplay badge if enabled
  if (autoplay) {
    audioAutoplayBadge.classList.remove('hidden');
  }

  // Add loading indicator to waveform
  const audioLabel = audioContainer.querySelector('.audio-label');
  if (audioLabel) {
    audioLabel.textContent = 'Loading audio...';
  }

  // Set audio source
  audioPlayer.src = audioUrl;

  // Handle successful audio load
  audioPlayer.oncanplaythrough = () => {
    console.log('[Renderer] Audio ready to play');
    if (audioLabel) {
      audioLabel.textContent = 'Audio message';
    }

    // Auto-play if enabled
    if (autoplay) {
      audioPlayer.play().catch(err => {
        console.warn('[Renderer] Auto-play blocked:', err);
        if (audioLabel) {
          audioLabel.textContent = 'Click to play';
        }
      });
    }
  };

  // Handle audio load error
  audioPlayer.onerror = (e) => {
    console.error('[Renderer] Failed to load audio:', audioUrl, e);
    if (audioLabel) {
      audioLabel.textContent = 'Failed to load audio';
    }
    // Gray out the waveform to indicate error
    const bars = audioWaveform.querySelectorAll('.audio-bar');
    bars.forEach(bar => {
      bar.style.background = 'rgba(100, 116, 139, 0.3)';
    });
    // Update icon color to indicate error
    const audioIcon = audioContainer.querySelector('.audio-icon');
    if (audioIcon) {
      audioIcon.style.background = 'rgba(239, 68, 68, 0.2)';
      const svg = audioIcon.querySelector('svg');
      if (svg) svg.style.color = '#fca5a5';
    }
  };

  // Animate waveform when playing
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

  // Make audio container clickable to toggle playback
  audioContainer.onclick = (e) => {
    // Don't play if there was a load error
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
    'TEXT': { width: 400, height: 160 },
    'TEXT_IMAGE': { width: 400, height: 340 },
    'VIDEO': { width: 400, height: 300 },
    'AUDIO': { width: 400, height: 220 }
  };

  const size = sizes[type] || sizes['TEXT'];
  window.creaBomber.requestResize(size.width, size.height);
}

/**
 * Initialize event handlers
 */
function init() {
  console.log('[Renderer] Initializing notification renderer...');

  // Close button
  closeBtn.addEventListener('click', () => {
    if (window.creaBomber) {
      window.creaBomber.closeNotification();
    }
  });

  // Subscribe to notifications from main process
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

    // For development/testing without Electron
    window.showTestNotification = showNotification;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
