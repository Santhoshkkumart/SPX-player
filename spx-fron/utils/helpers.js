import { COVER_IMAGES } from './constants';

export function formatTime(millis) {
  if (!millis || isNaN(millis)) return '0:00';
  const totalSeconds = millis / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export function sanitizeBaseUrl(url) {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}

export function getSongTitle(song) {
  if (!song) return '';
  if (typeof song === 'string') return song;

  if (song.title) return song.title;

  const rawName = song.name || song.filename;
  if (!rawName) return 'Untitled Song';

  const withoutExtension = rawName.replace(/\.[^.]+$/, '');
  const withoutUploadSuffix = withoutExtension
    .replace(/[-_ ]+\d{8,}$/, '')
    .replace(/[-_ ]+[a-f0-9]{6,}$/, '');

  return withoutUploadSuffix.replace(/[-_]+/g, ' ').trim() || withoutExtension;
}

export function getSongArtist(song) {
  if (!song) return 'Unknown Artist';
  if (typeof song === 'string') return 'Unknown Artist';
  return song.artist || 'Unknown Artist';
}

export function getSongStreamId(song) {
  if (!song) return 'unknown-song';
  if (typeof song === 'string') return song;
  return song.id || song.filename || song.slug || song.name || song.title || 'unknown-song';
}

export function getSongId(song) {
  if (!song) return '';
  if (typeof song === 'string') return song;
  return song.id || song.filename || song.name || 'unknown';
}

export function getCoverUrl(song, baseUrl) {
  if (!song) return COVER_IMAGES[0];
  if (typeof song === 'object' && song.coverUrl) {
    return song.coverUrl;
  }

  const songId = getSongStreamId(song);
  const safeBaseUrl = sanitizeBaseUrl(baseUrl);
  
  // If the backend says it has a cover, use the cover endpoint
  if (song.hasCover) {
    return `${safeBaseUrl}/cover/${encodeURIComponent(songId)}`;
  }
  
  // Fallback to placeholder based on song name to be deterministic
  const index = Math.abs(hashCode(songId)) % COVER_IMAGES.length;
  return COVER_IMAGES[index];
}

export function getPlaybackQueue(allSongs, visibleSongs, activeSong, activeFilter, query) {
  if (!Array.isArray(allSongs) || allSongs.length === 0) {
    return [];
  }

  const visibleQueue = Array.isArray(visibleSongs) ? visibleSongs : [];
  if (!activeSong) {
    return visibleQueue.length > 0 ? visibleQueue : allSongs;
  }

  const activeId = getSongStreamId(activeSong);
  const queue = visibleQueue.length > 0 ? visibleQueue : allSongs;
  const queueHasActiveSong = queue.some((song) => getSongStreamId(song) === activeId);
  if (queueHasActiveSong) {
    return queue;
  }

  if (activeFilter === 'liked' || (query && query.trim())) {
    return allSongs;
  }

  return queue;
}

export function getSongIndex(queue, activeSong) {
  if (!activeSong || !Array.isArray(queue)) return -1;
  const activeId = getSongStreamId(activeSong);
  return queue.findIndex((song) => getSongStreamId(song) === activeId);
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
