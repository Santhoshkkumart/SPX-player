import { useState, useEffect, useCallback, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { sanitizeBaseUrl, getSongStreamId, getSongId } from '../utils/helpers';

export function useAudio(backendUrl) {
  const playerRef = useRef(null);
  const statusSubscriptionRef = useRef(null);
  const currentSongRef = useRef(null);

  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState('');

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch((err) => {
      console.error('Failed to configure audio mode:', err);
      setAudioError('Failed to configure audio mode.');
    });

    return () => {
      if (statusSubscriptionRef.current) {
        try {
          statusSubscriptionRef.current.remove?.();
        } catch (e) {}
        statusSubscriptionRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.remove();
        } catch (e) {}
        playerRef.current = null;
      }
    };
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

  const handlePlaySong = useCallback(async (song) => {
    if (!song) return;

    const activeId = getSongId(currentSongRef.current);
    const newId = getSongId(song);

    // If tapping the already selected/playing song, toggle play/pause instead of spawning another player
    if (activeId && activeId === newId && playerRef.current) {
      togglePlayPause();
      return;
    }

    const streamId = getSongStreamId(song);
    const streamUrl = song.streamUrl || `${sanitizeBaseUrl(backendUrl)}/stream/${encodeURIComponent(streamId)}`;

    setIsBuffering(true);
    setAudioError('');

    try {
      // Clean up previous subscription & pause/remove previous player completely
      if (statusSubscriptionRef.current) {
        try {
          statusSubscriptionRef.current.remove?.();
        } catch (e) {}
        statusSubscriptionRef.current = null;
      }

      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.remove();
        } catch (cleanupError) {
          console.warn('Error cleaning up previous sound:', cleanupError);
        }
        playerRef.current = null;
      }

      // Create new player with instant high-fidelity streaming
      const player = createAudioPlayer(
        { uri: streamUrl },
        { updateInterval: 250 }
      );
      playerRef.current = player;

      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        setIsPlaying(Boolean(status.playing));
        setIsBuffering(Boolean(status.isBuffering));
        setPosition((status.currentTime || 0) * 1000);
        setDuration((status.duration || 0) * 1000);
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPosition(0);
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
    }
  }, [backendUrl, togglePlayPause]);

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
    handlePlaySong,
    togglePlayPause,
    seekTo,
    setCurrentSong,
  };
}
