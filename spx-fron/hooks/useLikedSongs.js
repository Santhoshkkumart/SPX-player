import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { sanitizeBaseUrl, getSongId } from '../utils/helpers';

export function useLikedSongs(backendUrl, authenticatedFetch, isAuthenticated) {
  const [likedSongs, setLikedSongs] = useState([]);

  const fetchLikedSongs = useCallback(async (baseUrl = backendUrl) => {
    if (!isAuthenticated || !authenticatedFetch) {
      setLikedSongs([]);
      return;
    }

    const safeBaseUrl = sanitizeBaseUrl(baseUrl);
    try {
      const response = await authenticatedFetch(`${safeBaseUrl}/likes`);
      if (response.ok) {
        const data = await response.json();
        setLikedSongs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch liked songs:', error);
    }
  }, [authenticatedFetch, backendUrl, isAuthenticated]);

  useEffect(() => {
    fetchLikedSongs();
  }, [fetchLikedSongs]);

  const toggleLikeSong = useCallback(async (song) => {
    const id = getSongId(song);
    if (!id || !authenticatedFetch) return;

    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    const liked = likedSongs.includes(id);
    setLikedSongs((prev) => (
      liked ? prev.filter(item => item !== id) : [...prev, id]
    ));

    try {
      const response = await authenticatedFetch(
        liked ? `${safeBaseUrl}/likes/${encodeURIComponent(id)}` : `${safeBaseUrl}/likes`,
        liked
          ? { method: 'DELETE' }
          : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songId: id }),
          }
      );

      if (!response.ok) throw new Error('Failed to update liked songs');
    } catch (error) {
      setLikedSongs((prev) => (
        liked ? [...prev, id] : prev.filter(item => item !== id)
      ));
      Alert.alert('Error', 'Failed to update liked songs');
    }
  }, [authenticatedFetch, backendUrl, likedSongs]);

  const isSongLiked = useCallback((song) => {
    return likedSongs.includes(getSongId(song));
  }, [likedSongs]);

  return {
    likedSongs,
    fetchLikedSongs,
    toggleLikeSong,
    isSongLiked,
  };
}
