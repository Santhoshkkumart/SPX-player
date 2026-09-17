import { useState, useEffect, useCallback, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { sanitizeBaseUrl, getSongStreamId, getSongId } from '../utils/helpers';

export function useAudio(backendUrl, options = {}) {
  const playerRef = useRef(null);
  const statusSubscriptionRef = useRef(null);
  const currentSongRef = useRef(null);
  const preloadedNextRef = useRef(false);
  const isSwitchingTrackRef = useRef(false);

  const onTrackFinishRef = useRef(options.onTrackFinish);
  const onPreloadNextRef = useRef(options.onPreloadNext);

  useEffect(() => {
    onTrackFinishRef.current = options.onTrackFinish;
    onPreloadNextRef.current = options.onPreloadNext;
  }, [options.onTrackFinish, options.onPreloadNext]);

  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState('');
  
  // Playback modes: repeatMode ('off' | 'all' | 'one'), isShuffle (boolean)
  const [repeatMode, setRepeatMode] = useState('off');
  const [isShuffle, setIsShuffle] = useState(false);

  const stopCurrentPlayer = useCallback(() => {
    if (statusSubscriptionRef.current) {
      try {
        statusSubscriptionRef.current.remove?.();
      } catch (e) {}
      statusSubscriptionRef.current = null;
    }
    if (playerRef.current) {
      try {
        const activePlayer = playerRef.current;
        playerRef.current = null;
        activePlayer.pause();
        activePlayer.remove();
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch((err) => {
      console.error('Failed to configure audio mode:', err);
      setAudioError('Failed to configure audio mode.');
    });

    return () => {
      stopCurrentPlayer();
    };
  }, [stopCurrentPlayer]);

  const toggleRepeatMode = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => !prev);
  }, []);

  const togglePlayPause = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      setAudioError('Playback control error');
    }
  }, []);

  const handlePlaySong = useCallback(async (song, forceReload = false) => {
    if (!song) return;
    if (isSwitchingTrackRef.current) return;

    const activeId = getSongId(currentSongRef.current);
    const newId = getSongId(song);

    // If tapping the already selected/playing song (and not force reloading), toggle play/pause
    if (!forceReload && activeId && activeId === newId && playerRef.current) {
      togglePlayPause();
      return;
    }

    isSwitchingTrackRef.current = true;
    const streamId = getSongStreamId(song);
    const streamUrl = song.streamUrl || `${sanitizeBaseUrl(backendUrl)}/stream/${encodeURIComponent(streamId)}`;

    setIsBuffering(true);
    setAudioError('');
    preloadedNextRef.current = false;

    try {
      // STOP and remove any existing player instance to prevent parallel audio playback!
      stopCurrentPlayer();

      // Create new audio player
      const player = createAudioPlayer(
        { uri: streamUrl },
        { updateInterval: 250 }
      );
      playerRef.current = player;

      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        setIsPlaying(Boolean(status.playing));
        setIsBuffering(Boolean(status.isBuffering));
        const currentPosMs = (status.currentTime || 0) * 1000;
        const durationMs = (status.duration || 0) * 1000;

        setPosition(currentPosMs);
        setDuration(durationMs);

        // Pre-buffer next track when within 10 seconds of track end
        if (durationMs > 12000 && (durationMs - currentPosMs) <= 10000 && !preloadedNextRef.current) {
          preloadedNextRef.current = true;
          if (onPreloadNextRef.current) {
            onPreloadNextRef.current();
          }
        }

        if (status.didJustFinish) {
          setIsPlaying(false);
          setPosition(0);
          preloadedNextRef.current = false;
          if (onTrackFinishRef.current) {
            onTrackFinishRef.current();
          }
        }
      });
      statusSubscriptionRef.current = subscription;

      player.play();
      currentSongRef.current = song;
      setCurrentSong(song);
      setIsPlaying(true);
    } catch (error) {
      console.error('Audio loading error:', error);
      setAudioError(error.message || 'Unable to load audio.');
    } finally {
      setIsBuffering(false);
      isSwitchingTrackRef.current = false;
    }
  }, [backendUrl, togglePlayPause, stopCurrentPlayer]);

  const seekTo = useCallback(async (millis) => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const seconds = millis / 1000;
      await player.seekTo(seconds);
      setPosition(millis);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, []);

  return {
    currentSong,
    isPlaying,
    isBuffering,
    position,
    duration,
    audioError,
    repeatMode,
    isShuffle,
    toggleRepeatMode,
    toggleShuffle,
    handlePlaySong,
    togglePlayPause,
    seekTo,
    setCurrentSong,
  };
}
