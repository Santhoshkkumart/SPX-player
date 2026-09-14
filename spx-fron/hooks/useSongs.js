import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { sanitizeBaseUrl } from '../utils/helpers';

export function useSongs(initialBackendUrl, authenticatedFetch) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [backendUrl, setBackendUrl] = useState(initialBackendUrl);
  const backendUrlRef = useRef(initialBackendUrl);

  const handleSetBackendUrl = useCallback((url) => {
    backendUrlRef.current = url;
    setBackendUrl(url);
  }, []);

  const fetchSongs = useCallback(async (baseUrl) => {
    const resolvedUrl = baseUrl !== undefined ? baseUrl : backendUrlRef.current;
    const safeBaseUrl = sanitizeBaseUrl(resolvedUrl);
    const request = authenticatedFetch || fetch;
    setLoading(true);
    setFetchError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await request(`${safeBaseUrl}/songs`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      setSongs(Array.isArray(data) ? data : []);
      handleSetBackendUrl(safeBaseUrl);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Fetch error:', error);

      if (Platform.OS === 'android' &&
          (resolvedUrl === 'http://10.0.2.2:3000' || resolvedUrl.includes('10.0.2.2'))) {
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), 5000);
        try {
          const localhostResponse = await request('http://localhost:3000/songs', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: fallbackController.signal,
          });
          clearTimeout(fallbackTimeout);
          if (localhostResponse.ok) {
            const localhostData = await localhostResponse.json();
            setSongs(Array.isArray(localhostData) ? localhostData : []);
            handleSetBackendUrl('http://localhost:3000');
            setLoading(false);
            return;
          }
        } catch (localError) {
          clearTimeout(fallbackTimeout);
          console.log('Localhost fallback failed:', localError);
        }
      }

      const isTimeout = error.name === 'AbortError';
      const msg = isTimeout
        ? 'Connection timed out. Make sure the server is running and you are on the same Wi-Fi network.'
        : `Could not reach server: ${error.message}`;
      setFetchError(`${msg}\n(Tried: ${safeBaseUrl})`);
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, handleSetBackendUrl]);

  const resyncLibrary = useCallback(async (baseUrl) => {
    const resolvedUrl = baseUrl !== undefined ? baseUrl : backendUrlRef.current;
    const safeBaseUrl = sanitizeBaseUrl(resolvedUrl);
    const request = authenticatedFetch || fetch;
    setLoading(true);
    setFetchError('');
    try {
      const response = await request(`${safeBaseUrl}/library/resync`, { method: 'POST' });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      if (Array.isArray(data.songs)) {
        setSongs(data.songs);
        return data;
      }
      await fetchSongs(safeBaseUrl);
      return data;
    } catch (error) {
      console.error('Resync error:', error);
      setFetchError('Could not resync the music library.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, fetchSongs]);

  const deleteSong = useCallback(async (song) => {
    const songId = typeof song === 'string' ? song : (song?.id || song?.filename);
    if (!songId) return false;
    const safeBaseUrl = sanitizeBaseUrl(backendUrlRef.current);
    const request = authenticatedFetch || fetch;
    try {
      const response = await request(`${safeBaseUrl}/songs/${encodeURIComponent(songId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete song');
      }
      setSongs((prev) => prev.filter((item) => (item.id || item.filename) !== songId));
      return true;
    } catch (error) {
      console.error('Delete song error:', error);
      throw error;
    }
  }, [authenticatedFetch]);

  return {
    songs,
    loading,
    fetchError,
    backendUrl,
    setBackendUrl: handleSetBackendUrl,
    fetchSongs,
    resyncLibrary,
    deleteSong,
  };
}
