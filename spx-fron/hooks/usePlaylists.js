import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { sanitizeBaseUrl } from '../utils/helpers';

export function usePlaylists(backendUrl) {
  const [playlists, setPlaylists] = useState([]);

  const fetchPlaylists = useCallback(async (baseUrl = backendUrl) => {
    const safeBaseUrl = sanitizeBaseUrl(baseUrl);
    try {
      const response = await fetch(`${safeBaseUrl}/playlists`);
      if (response.ok) {
        const data = await response.json();
        setPlaylists(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  }, [backendUrl]);

  const createPlaylist = useCallback(async (name) => {
    if (!name.trim()) return;
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    try {
      const response = await fetch(`${safeBaseUrl}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (response.ok) {
        fetchPlaylists();
        return true;
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to create playlist');
        return false;
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server');
      return false;
    }
  }, [backendUrl, fetchPlaylists]);

  const addSongToPlaylist = useCallback(async (playlistId, songId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    if (playlist.songs.includes(songId)) {
      Alert.alert('Info', 'Song already in playlist');
      return;
    }

    const updatedSongs = [...playlist.songs, songId];
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    try {
      const response = await fetch(`${safeBaseUrl}/playlists/${playlistId}`, {
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
  }, [backendUrl, playlists, fetchPlaylists]);

  const removeSongFromPlaylist = useCallback(async (playlistId, songId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const updatedSongs = playlist.songs.filter(id => id !== songId);
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    try {
      const response = await fetch(`${safeBaseUrl}/playlists/${playlistId}`, {
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
  }, [backendUrl, playlists, fetchPlaylists]);

  const deletePlaylist = useCallback(async (playlistId) => {
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    try {
      const response = await fetch(`${safeBaseUrl}/playlists/${playlistId}`, {
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
  }, [backendUrl, fetchPlaylists]);

  return {
    playlists,
    fetchPlaylists,
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    deletePlaylist,
  };
}
