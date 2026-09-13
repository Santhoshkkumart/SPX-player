import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { sanitizeBaseUrl } from '../utils/helpers';

export function usePlaylists(backendUrl, authenticatedFetch) {
  const [playlists, setPlaylists] = useState([]);

  const fetchPlaylists = useCallback(async (baseUrl = backendUrl) => {
    const safeBaseUrl = sanitizeBaseUrl(baseUrl);
    const request = authenticatedFetch || fetch;
    try {
      const response = await request(`${safeBaseUrl}/playlists`);
      if (response.ok) {
        const data = await response.json();
        setPlaylists(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  }, [authenticatedFetch, backendUrl]);

  const createPlaylist = useCallback(async (name) => {
    if (!name.trim()) return false;
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    const request = authenticatedFetch || fetch;
    try {
      const response = await request(`${safeBaseUrl}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (response.ok) {
        fetchPlaylists();
        return true;
      }
      const error = await response.json().catch(() => ({}));
      Alert.alert('Error', error.error || 'Failed to create playlist');
      return false;
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server');
      return false;
    }
  }, [authenticatedFetch, backendUrl, fetchPlaylists]);

  const addSongToPlaylist = useCallback(async (playlistId, songId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return false;

    if (playlist.songs.includes(songId)) {
      Alert.alert('Info', 'Song already in playlist');
      return false;
    }

    const updatedSongs = [...playlist.songs, songId];
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    const request = authenticatedFetch || fetch;
    try {
      const response = await request(`${safeBaseUrl}/playlists/${playlistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: updatedSongs }),
      });
      if (response.ok) {
        fetchPlaylists();
        Alert.alert('Success', 'Song added to playlist');
        return true;
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add song to playlist');
    }
    return false;
  }, [authenticatedFetch, backendUrl, playlists, fetchPlaylists]);

  const removeSongFromPlaylist = useCallback(async (playlistId, songId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return null;

    const updatedSongs = playlist.songs.filter(id => id !== songId);
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    const request = authenticatedFetch || fetch;
    try {
      const response = await request(`${safeBaseUrl}/playlists/${playlistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: updatedSongs }),
      });
      if (response.ok) {
        const updatedP = await response.json();
        fetchPlaylists();
        return updatedP;
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove song');
    }
    return null;
  }, [authenticatedFetch, backendUrl, playlists, fetchPlaylists]);

  const deletePlaylist = useCallback(async (playlistId) => {
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    const request = authenticatedFetch || fetch;
    try {
      const response = await request(`${safeBaseUrl}/playlists/${playlistId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchPlaylists();
        return true;
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete playlist');
    }
    return false;
  }, [authenticatedFetch, backendUrl, fetchPlaylists]);

  return {
    playlists,
    fetchPlaylists,
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    deletePlaylist,
  };
}
