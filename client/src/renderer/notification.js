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
  textContent.textContent = '';

  // Reset image
  imageContent.src = '';
  imageContent.classList.remove('loaded');
  imageContent.classList.add('loading');
  imageLoading.classList.remove('hidden');

  // Reset video
  videoThumbImg.src = '';

  // Reset audio
  audioPlayer.pause();
  audioPlayer.src = '';
  audioAutoplayBadge.classList.add('hidden');

  // Reset progress
  stopProgress();
  progressBar.style.transform = 'scaleX(1)';

  currentPayload = null;
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

  // Set text content
  if (payload.content) {
    textContent.textContent = payload.content;
  } else {
    textContent.textContent = '';
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
 * Show image content
 */
function showImage(imageUrl) {
  imageContainer.classList.remove('hidden');

  // Show loading state
  imageLoading.classList.remove('hidden');
  imageContent.classList.add('loading');

  // Load image
  imageContent.onload = () => {
    imageLoading.classList.add('hidden');
    imageContent.classList.remove('loading');
    imageContent.classList.add('loaded');
  };

  imageContent.onerror = () => {
    console.error('[Renderer] Failed to load image:', imageUrl);
    imageLoading.classList.add('hidden');
    // Show error state
    imageContainer.innerHTML = '<div class="notification-error"><span class="notification-error-text">Failed to load image</span></div>';
  };

  imageContent.src = imageUrl;
}

/**
 * Show video thumbnail
 */
function showVideo(videoUrl) {
  videoContainer.classList.remove('hidden');

  const thumbnailUrl = getThumbnailUrl(videoUrl);

  if (thumbnailUrl) {
    videoThumbImg.src = thumbnailUrl;
    videoThumbImg.onerror = () => {
      // Use a placeholder if thumbnail fails
      videoThumbImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWUyOTNiIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NDc0OGIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5WaWRlbzwvdGV4dD48L3N2Zz4=';
    };
  } else {
    // Placeholder for unknown video sources
    videoThumbImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWUyOTNiIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NDc0OGIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5WaWRlbzwvdGV4dD48L3N2Zz4=';
  }

  // Handle click to open video in browser
  videoThumbnail.onclick = () => {
    openVideoUrl(videoUrl);
  };
}

/**
 * Show audio player
 */
function showAudio(audioUrl, autoplay = false) {
  audioContainer.classList.remove('hidden');

  // Generate waveform visualization
  generateWaveform();

  // Show autoplay badge if enabled
  if (autoplay) {
    audioAutoplayBadge.classList.remove('hidden');
  }

  // Set audio source
  audioPlayer.src = audioUrl;

  // Handle audio playback
  if (autoplay) {
    audioPlayer.play().catch(err => {
      console.warn('[Renderer] Auto-play blocked:', err);
      // Browser may block autoplay - user will need to interact
    });
  }

  // Animate waveform when playing
  audioPlayer.onplay = () => {
    const bars = audioWaveform.querySelectorAll('.audio-bar');
    bars.forEach((bar, i) => {
      bar.classList.add('animated');
      bar.style.animationDelay = `${i * 0.05}s`;
    });
  };

  audioPlayer.onpause = () => {
    const bars = audioWaveform.querySelectorAll('.audio-bar');
    bars.forEach(bar => bar.classList.remove('animated'));
  };

  // Make audio container clickable to toggle playback
  audioContainer.onclick = (e) => {
    if (e.target === audioContainer || e.target.closest('.audio-icon') || e.target.closest('.audio-waveform')) {
      if (audioPlayer.paused) {
        audioPlayer.play().catch(() => {});
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
