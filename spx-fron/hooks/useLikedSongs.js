import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSongId } from '../utils/helpers';

export function useLikedSongs() {
  const [likedSongs, setLikedSongs] = useState([]);

  useEffect(() => {
    const loadLikedSongs = async () => {
      try {
        const saved = await AsyncStorage.getItem('@likedSongs');
        if (saved) {
          setLikedSongs(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load liked songs', e);
      }
    };
    loadLikedSongs();
  }, []);

  useEffect(() => {
    const persistLikedSongs = async () => {
      try {
        await AsyncStorage.setItem('@likedSongs', JSON.stringify(likedSongs));
      } catch (e) {
        console.error('Failed to save liked songs', e);
      }
    };
    persistLikedSongs();
  }, [likedSongs]);

  const toggleLikeSong = useCallback((song) => {
    const id = getSongId(song);
    setLikedSongs((prev) => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  const isSongLiked = useCallback((song) => {
    return likedSongs.includes(getSongId(song));
  }, [likedSongs]);

  return {
    likedSongs,
    toggleLikeSong,
    isSongLiked,
  };
}
