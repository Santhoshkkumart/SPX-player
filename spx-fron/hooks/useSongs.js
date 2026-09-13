import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { sanitizeBaseUrl } from '../utils/helpers';

export function useSongs(initialBackendUrl) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [backendUrl, setBackendUrl] = useState(initialBackendUrl);
  // Keep a stable ref to backendUrl so fetchSongs doesn't need it in deps
  const backendUrlRef = useRef(initialBackendUrl);

  const handleSetBackendUrl = useCallback((url) => {
    backendUrlRef.current = url;
    setBackendUrl(url);
  }, []);

  const fetchSongs = useCallback(async (baseUrl) => {
    const resolvedUrl = baseUrl !== undefined ? baseUrl : backendUrlRef.current;
    const safeBaseUrl = sanitizeBaseUrl(resolvedUrl);
    setLoading(true);
    setFetchError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${safeBaseUrl}/songs`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      setSongs(Array.isArray(data) ? data : []);
      handleSetBackendUrl(safeBaseUrl);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Fetch error:', error);

      // Android emulator fallback — use a FRESH controller so we don't reuse the aborted one
      if (Platform.OS === 'android' &&
          (resolvedUrl === 'http://10.0.2.2:3000' || resolvedUrl.includes('10.0.2.2'))) {
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), 5000);
        try {
          const localhostResponse = await fetch('http://localhost:3000/songs', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: fallbackController.signal
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
  }, [handleSetBackendUrl]);

  return {
    songs,
    loading,
    fetchError,
    backendUrl,
    setBackendUrl: handleSetBackendUrl,
    fetchSongs,
  };
}
