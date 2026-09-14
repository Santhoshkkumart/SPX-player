import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';
import { sanitizeBaseUrl } from '../utils/helpers';

const ACCESS_TOKEN_KEY = 'pulsePlayerAccessToken';
const REFRESH_TOKEN_KEY = 'pulsePlayerRefreshToken';

async function saveSecureItem(key, value) {
  try {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.warn('SecureStore save error:', e);
  }
}

async function getSecureItem(key) {
  try {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.warn('SecureStore get error:', e);
    return null;
  }
}

async function deleteSecureItem(key) {
  try {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.warn('SecureStore delete error:', e);
  }
}

export function useAuth(initialBackendUrl) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const accessTokenRef = useRef('');
  const refreshTokenRef = useRef('');
  const backendUrlRef = useRef(sanitizeBaseUrl(initialBackendUrl));

  const setBackendUrlRef = useCallback((url) => {
    backendUrlRef.current = sanitizeBaseUrl(url);
  }, []);

  const setSession = useCallback(async (session) => {
    const nextAccessToken = session.accessToken || '';
    const nextRefreshToken = session.refreshToken || '';
    accessTokenRef.current = nextAccessToken;
    refreshTokenRef.current = nextRefreshToken;
    setAccessToken(nextAccessToken);
    setRefreshToken(nextRefreshToken);
    setUser(session.user || null);

    if (nextAccessToken && nextRefreshToken) {
      await Promise.all([
        saveSecureItem(ACCESS_TOKEN_KEY, nextAccessToken),
        saveSecureItem(REFRESH_TOKEN_KEY, nextRefreshToken),
      ]);
    }
  }, []);

  const clearSession = useCallback(async () => {
    accessTokenRef.current = '';
    refreshTokenRef.current = '';
    setAccessToken('');
    setRefreshToken('');
    setUser(null);
    await Promise.all([
      deleteSecureItem(ACCESS_TOKEN_KEY),
      deleteSecureItem(REFRESH_TOKEN_KEY),
    ]);
  }, []);

  const refreshSession = useCallback(async () => {
    const safeBaseUrl = sanitizeBaseUrl(backendUrlRef.current);
    const token = refreshTokenRef.current;
    if (!safeBaseUrl || !token) throw new Error('No refresh token');

    const response = await fetch(`${safeBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });

    if (!response.ok) throw new Error('Session expired');
    const session = await response.json();
    await setSession(session);
    return session.accessToken;
  }, [setSession]);

  const authenticatedFetch = useCallback(async (pathOrUrl, options = {}, retry = true) => {
    const safeBaseUrl = sanitizeBaseUrl(backendUrlRef.current);
    const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${safeBaseUrl}${pathOrUrl}`;
    const headers = {
      ...(options.headers || {}),
      ...(accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 && retry && refreshTokenRef.current) {
      try {
        const nextToken = await refreshSession();
        return fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${nextToken}`,
          },
        });
      } catch (err) {
        await clearSession();
      }
    }
    return response;
  }, [clearSession, refreshSession]);

  const restoreSession = useCallback(async () => {
    setAuthLoading(true);
    setAuthError('');

    // Safety fallback timer to ensure app never hangs on 'Restoring session...' forever
    const safetyTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 4000);

    try {
      const storagePromise = Promise.all([
        getSecureItem(ACCESS_TOKEN_KEY),
        getSecureItem(REFRESH_TOKEN_KEY),
      ]);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Storage timeout')), 2500)
      );

      const [savedAccessToken, savedRefreshToken] = await Promise.race([storagePromise, timeoutPromise]);

      accessTokenRef.current = savedAccessToken || '';
      refreshTokenRef.current = savedRefreshToken || '';
      setAccessToken(savedAccessToken || '');
      setRefreshToken(savedRefreshToken || '');

      if (savedAccessToken) {
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 3500);

        try {
          const response = await authenticatedFetch('/auth/me', { signal: controller.signal });
          clearTimeout(fetchTimeout);

          if (response && response.ok) {
            const payload = await response.json().catch(() => ({}));
            setUser(payload.user || null);
          } else if (savedRefreshToken) {
            await refreshSession();
          } else {
            await clearSession();
          }
        } catch (e) {
          clearTimeout(fetchTimeout);
          console.warn('Restore session network error or timeout:', e);
          await clearSession();
        }
      }
    } catch (err) {
      console.warn('Restore session storage error or timeout:', err);
      await clearSession();
    } finally {
      clearTimeout(safetyTimer);
      setAuthLoading(false);
    }
  }, [authenticatedFetch, clearSession, refreshSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async ({ email, password }) => {
    const safeBaseUrl = sanitizeBaseUrl(backendUrlRef.current);
    setAuthError('');
    try {
      const response = await fetch(`${safeBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Login failed');
      await setSession(payload);
      return true;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      return false;
    }
  }, [setSession]);

  const register = useCallback(async ({ username, email, password }) => {
    const safeBaseUrl = sanitizeBaseUrl(backendUrlRef.current);
    setAuthError('');
    try {
      const response = await fetch(`${safeBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Registration failed');
      await setSession(payload);
      return true;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      return false;
    }
  }, [setSession]);

  const logout = useCallback(async () => {
    try {
      if (accessTokenRef.current) {
        await authenticatedFetch('/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenRef.current }),
        }, false);
      }
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      await clearSession();
      Alert.alert('Signed out', 'You have been logged out.');
    }
  }, [authenticatedFetch, clearSession]);

  return useMemo(() => ({
    user,
    accessToken,
    refreshToken,
    authLoading,
    authError,
    authMode,
    setAuthMode,
    login,
    register,
    logout,
    restoreSession,
    refreshSession,
    authenticatedFetch,
    setBackendUrlRef,
    isAuthenticated: Boolean(user && accessToken),
  }), [
    user,
    accessToken,
    refreshToken,
    authLoading,
    authError,
    authMode,
    login,
    register,
    logout,
    restoreSession,
    refreshSession,
    authenticatedFetch,
    setBackendUrlRef,
  ]);
}
