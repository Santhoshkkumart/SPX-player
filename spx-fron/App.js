import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Search, 
  Menu, 
  Plus,
  Trash2,
  ChevronLeft,
  Upload,
  RefreshCw,
  ListMusic,
  Home,
  Disc,
  Clock,
  Heart,
  Sparkles,
} from 'lucide-react-native';

// Hooks
import { useAudio } from './hooks/useAudio';
import { useSongs } from './hooks/useSongs';
import { usePlaylists } from './hooks/usePlaylists';
import { useLikedSongs } from './hooks/useLikedSongs';
import { useAuth } from './hooks/useAuth';

// Components
import { MiniPlayer } from './components/MiniPlayer';
import { SongRow } from './components/SongRow';
import { PlaylistCard } from './components/PlaylistCard';
import { PlayerView } from './screens/PlayerView';
import { SettingsModal, CreatePlaylistModal, AddToPlaylistModal, AddSongsToPlaylistModal } from './components/Modals';
import { AuthScreen } from './components/AuthScreen';

// Utils
import { 
  getSongTitle, 
  getSongId, 
  getSongStreamId,
  getCoverUrl, 
  getPlaybackQueue, 
  getSongIndex,
  sanitizeBaseUrl 
} from './utils/helpers';
import { DEFAULT_BACKEND_URL } from './utils/constants';

const getDefaultBackendUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (typeof configuredUrl === 'string' && configuredUrl.trim()) {
    return sanitizeBaseUrl(configuredUrl);
  }
  return DEFAULT_BACKEND_URL;
};

export default function App() {
  const initialBackendUrl = getDefaultBackendUrl();
  const auth = useAuth(initialBackendUrl);
  const { width: liveWidth, height: liveHeight } = useWindowDimensions();
  const isLandscape = liveWidth > liveHeight;
  const isCompactDevice = liveWidth < 380;
  
  const topInset = Platform.OS === 'android'
    ? (StatusBar.currentHeight || 0) + 8
    : isLandscape ? 10 : isCompactDevice ? 18 : 24;

  // Hooks state
  const { 
    songs, 
    loading, 
    fetchError, 
    backendUrl, 
    setBackendUrl, 
    fetchSongs 
  } = useSongs(initialBackendUrl, auth.authenticatedFetch);

  const { 
    playlists, 
    fetchPlaylists, 
    createPlaylist, 
    addSongToPlaylist, 
    removeSongFromPlaylist, 
    deletePlaylist 
  } = usePlaylists(backendUrl, auth.authenticatedFetch);

  const {
    likedSongs,
    fetchLikedSongs,
    toggleLikeSong,
    isSongLiked
  } = useLikedSongs(backendUrl, auth.authenticatedFetch, auth.isAuthenticated);

  // Navigation tab & UI state
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'songs' | 'playlists'
  const [view, setView] = useState('home'); // 'home' | 'player'
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'liked'
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState({
    uploading: false,
    currentIndex: 0,
    totalFiles: 0,
    fileName: '',
    percent: 0,
    speedText: '',
  });
  const uploading = uploadProgress.uploading;

  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showAddSongsToPlaylist, setShowAddSongsToPlaylist] = useState(false);

  // Derived song arrays
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = getSongTitle(song).toLowerCase().includes(searchQuery.toLowerCase());
      if (filter === 'liked') {
        return matchesSearch && isSongLiked(song);
      }
      return matchesSearch;
    });
  }, [songs, searchQuery, filter, isSongLiked]);

  const selectedPlaylistSongs = useMemo(() => {
    if (!selectedPlaylist || !Array.isArray(selectedPlaylist.songs)) return [];
    return selectedPlaylist.songs.map(item => {
      if (typeof item === 'object' && item !== null && (item.id || item.filename)) return item;
      const itemIdStr = String(item);
      const found = songs.find(s => getSongId(s) === itemIdStr || getSongStreamId(s) === itemIdStr);
      return found || { id: itemIdStr, filename: itemIdStr, title: getSongTitle(itemIdStr), artist: 'Unknown Artist' };
    });
  }, [selectedPlaylist, songs]);

  const playbackQueue = useMemo(() => {
    if (selectedPlaylist && selectedPlaylistSongs.length > 0) {
      return selectedPlaylistSongs;
    }
    return getPlaybackQueue(songs, filteredSongs, currentSong, filter, searchQuery);
  }, [selectedPlaylist, selectedPlaylistSongs, songs, filteredSongs, currentSong, filter, searchQuery]);

  const likedSongItems = useMemo(() => {
    return songs.filter(song => isSongLiked(song));
  }, [songs, isSongLiked]);

  // Queue and Song Refs for Auto-Advance
  const playbackQueueRef = useRef(playbackQueue);
  const currentSongRef = useRef(null);

  useEffect(() => {
    playbackQueueRef.current = playbackQueue;
  }, [playbackQueue]);

  // Track finish auto-advance callback
  const handleTrackFinish = useCallback(() => {
    const queue = playbackQueueRef.current;
    if (!queue || queue.length === 0) return;

    const current = currentSongRef.current;
    const currentIndex = getSongIndex(queue, current);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % queue.length;

    if (queue[nextIndex]) {
      handlePlaySongWithTracking(queue[nextIndex]);
    }
  }, []);

  // 10s rule pre-buffering callback
  const handlePreloadNext = useCallback(() => {
    const queue = playbackQueueRef.current;
    if (!queue || queue.length <= 1) return;

    const current = currentSongRef.current;
    const currentIndex = getSongIndex(queue, current);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % queue.length;
    const nextSong = queue[nextIndex];
    const streamId = getSongStreamId(nextSong);
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    const prefetchUrl = `${safeBaseUrl}/stream/${encodeURIComponent(streamId)}`;
    fetch(prefetchUrl, { headers: { Range: 'bytes=0-32768' } }).catch(() => {});
  }, [backendUrl]);

  const playNextSong = useCallback(() => {
    const queue = playbackQueueRef.current;
    if (!queue || !queue.length) return;
    const current = currentSongRef.current;
    const currentIndex = getSongIndex(queue, current);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % queue.length;
    if (queue[nextIndex]) {
      handlePlaySongWithTracking(queue[nextIndex]);
    }
  }, []);

  const playPreviousSong = useCallback(() => {
    const queue = playbackQueueRef.current;
    if (!queue || !queue.length) return;
    const current = currentSongRef.current;
    const currentIndex = getSongIndex(queue, current);
    const previousIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + queue.length) % queue.length;
    if (queue[previousIndex]) {
      handlePlaySongWithTracking(queue[previousIndex]);
    }
  }, []);

  // Audio Hook
  const { 
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
    setCurrentSong
  } = useAudio(backendUrl, {
    onTrackFinish: handleTrackFinish,
    onPreloadNext: handlePreloadNext,
    onNextTrack: playNextSong,
    onPreviousTrack: playPreviousSong,
  });

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  const handlePlaySongWithTracking = (song) => {
    if (song) {
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(s => getSongId(s) !== getSongId(song));
        return [song, ...filtered].slice(0, 10);
      });
    }
    handlePlaySong(song);
  };

  // Effects
  useEffect(() => {
    auth.setBackendUrlRef(backendUrl);
  }, [auth, backendUrl]);

  useEffect(() => {
    if (auth.isAuthenticated && backendUrl) {
      fetchSongs(backendUrl);
      fetchPlaylists(backendUrl);
      fetchLikedSongs(backendUrl);
    }
  }, [auth.isAuthenticated, backendUrl, fetchSongs, fetchPlaylists, fetchLikedSongs]);

  useEffect(() => {
    setSelectedPlaylist((current) => {
      if (!current) return current;
      const latest = playlists.find((playlist) => playlist.id === current.id);
      return latest || null;
    });
  }, [playlists]);

  useEffect(() => {
    const onBackPress = () => {
      if (showSettings) { setShowSettings(false); return true; }
      if (showCreatePlaylist) { setShowCreatePlaylist(false); return true; }
      if (showAddToPlaylist) { setShowAddToPlaylist(false); return true; }
      if (showAddSongsToPlaylist) { setShowAddSongsToPlaylist(false); return true; }
      if (selectedPlaylist) { setSelectedPlaylist(null); return true; }
      if (view === 'player') { setView('home'); return true; }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [showSettings, showCreatePlaylist, showAddToPlaylist, showAddSongsToPlaylist, selectedPlaylist, view]);

  // Handlers
  const openSettings = () => {
    setTempUrl(backendUrl);
    setShowSettings(true);
  };

  const saveSettings = () => {
    if (tempUrl.trim()) {
      setBackendUrl(tempUrl.trim());
      auth.setBackendUrlRef(tempUrl.trim());
      if (auth.isAuthenticated) {
        fetchSongs(tempUrl.trim());
        fetchPlaylists(tempUrl.trim());
        fetchLikedSongs(tempUrl.trim());
      }
    }
    setShowSettings(false);
  };

  const handleTestConnection = async () => {
    if (!tempUrl.trim()) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${sanitizeBaseUrl(tempUrl)}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        Alert.alert('Success', 'Connection successful!');
      } else {
        Alert.alert('Error', 'Server responded but may not be SPX Player server');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server');
    }
  };

  const handleResyncLibrary = async () => {
    try {
      const safeBaseUrl = sanitizeBaseUrl(backendUrl);
      const response = await auth.authenticatedFetch(`${safeBaseUrl}/resync`, { method: 'POST' });
      if (!response.ok) throw new Error('Resync failed');
      Alert.alert('Library Resynced', 'Scanned directory and updated songs list.');
      fetchSongs();
    } catch (error) {
      Alert.alert('Resync Failed', error.message || 'Could not resync library');
    }
  };

  const handleCreatePlaylist = async () => {
    const created = await createPlaylist(newPlaylistName);
    if (!created) return;
    setNewPlaylistName('');
    setShowCreatePlaylist(false);
    if (songToAddToPlaylist && created.id) {
      await addSongToPlaylist(created.id, getSongId(songToAddToPlaylist));
      setShowAddToPlaylist(false);
      setSongToAddToPlaylist(null);
    }
  };

  const handleAddSongToPlaylist = async (playlistId) => {
    if (!songToAddToPlaylist) return;
    await addSongToPlaylist(playlistId, getSongId(songToAddToPlaylist));
    setShowAddToPlaylist(false);
    setSongToAddToPlaylist(null);
  };

  const handleBatchAddSongToSelectedPlaylist = async (song) => {
    if (!selectedPlaylist || !song) return;
    await addSongToPlaylist(selectedPlaylist.id, getSongId(song));
  };

  const openAddToPlaylistModal = (song) => {
    setSongToAddToPlaylist(song);
    setShowAddToPlaylist(true);
  };

  const handleDeletePlaylist = async (playlistId) => {
    Alert.alert(
      'Delete Playlist',
      'Are you sure you want to delete this playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlaylist(playlistId);
            setSelectedPlaylist(null);
          },
        },
      ]
    );
  };

  const handleDownloadSong = async (song) => {
    if (!song) return;
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    const streamId = getSongStreamId(song);
    const downloadUrl = `${safeBaseUrl}/download/${encodeURIComponent(streamId)}`;
    const title = getSongTitle(song);
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}.mp3`;

    try {
      if (Platform.OS === 'web') {
        window.open(downloadUrl, '_blank');
        return;
      }

      const fileUri = FileSystem.documentDirectory + fileName;
      Alert.alert('Downloading...', `Downloading "${title}" to device storage.`);

      const headers = {};
      if (auth.accessToken) {
        headers['Authorization'] = `Bearer ${auth.accessToken}`;
      }

      const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri, { headers });
      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          Alert.alert('Download Complete', `Saved to ${downloadRes.uri}`);
        }
      } else {
        Alert.alert('Download Failed', `Server returned status ${downloadRes.status}`);
      }
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Download Error', err.message || 'Unable to download song.');
    }
  };

  const handleDeleteSong = async (song) => {
    if (!song) return;
    const streamId = getSongStreamId(song);
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    try {
      const res = await auth.authenticatedFetch(`${safeBaseUrl}/songs/${encodeURIComponent(streamId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        Alert.alert('Song Deleted', 'Song was removed from server.');
        fetchSongs();
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Delete Failed', data.error || 'Failed to delete song.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      Alert.alert('Delete Error', err.message || 'Unable to delete song.');
    }
  };

  const pickAndUploadSong = async () => {
    const safeBaseUrl = sanitizeBaseUrl(backendUrl);
    if (!safeBaseUrl) {
      Alert.alert('Server not set', 'Please configure your server URL in Settings.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/flac', 'audio/ogg'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const rawAssets = result.assets || (result.uri ? [result] : []);
      if (!rawAssets || rawAssets.length === 0) {
        Alert.alert('Upload failed', 'No file was selected.');
        return;
      }

      const audioExts = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.oga'];
      const validAssets = [];

      for (const asset of rawAssets) {
        const fileUri = asset.uri || asset.file?.uri;
        if (!fileUri || typeof fileUri !== 'string') continue;

        let fileName = asset.name || 'song.mp3';
        try {
          fileName = decodeURIComponent(fileName);
        } catch (e) {}
        fileName = fileName.replace(/%20/gi, ' ').trim();

        const rawMime = (asset.mimeType || '').toLowerCase();
        const fileExt = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : '';
        const hasAudioExt = audioExts.includes(fileExt);
        const isAudioMime = rawMime.startsWith('audio/') || rawMime === 'application/octet-stream' || rawMime === '';

        if (hasAudioExt || isAudioMime) {
          if (!hasAudioExt) {
            fileName = `${fileName}.mp3`;
          }
          const mimeType = rawMime.startsWith('audio/') ? rawMime : 'audio/mpeg';
          validAssets.push({
            uri: fileUri,
            name: fileName,
            type: mimeType,
          });
        }
      }

      if (validAssets.length === 0) {
        Alert.alert('Unsupported file(s)', 'Please select valid audio files (.mp3, .m4a, .wav, etc.).');
        return;
      }

      const totalFiles = validAssets.length;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < totalFiles; i++) {
        const currentFile = validAssets[i];

        setUploadProgress({
          uploading: true,
          currentIndex: i + 1,
          totalFiles,
          fileName: currentFile.name,
          percent: 0,
          speedText: '0 KB/s',
        });

        try {
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${safeBaseUrl}/upload`);
            xhr.setRequestHeader('Accept', 'application/json');
            if (auth.accessToken) {
              xhr.setRequestHeader('Authorization', `Bearer ${auth.accessToken}`);
            }

            let lastLoaded = 0;
            let lastTime = Date.now();

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable && event.total > 0) {
                const rawPercent = Math.round((event.loaded / event.total) * 100);
                const percent = Math.min(100, Math.max(0, rawPercent));
                const now = Date.now();
                const timeDiff = (now - lastTime) / 1000;

                if (timeDiff >= 0.25 || percent === 100) {
                  const bytesDiff = event.loaded - lastLoaded;
                  const bytesPerSec = timeDiff > 0 ? bytesDiff / timeDiff : 0;
                  let speedStr = '';
                  if (bytesPerSec >= 1024 * 1024) {
                    speedStr = `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
                  } else {
                    speedStr = `${Math.round(bytesPerSec / 1024)} KB/s`;
                  }

                  setUploadProgress(prev => ({
                    ...prev,
                    percent,
                    speedText: speedStr,
                  }));

                  lastLoaded = event.loaded;
                  lastTime = now;
                } else {
                  setUploadProgress(prev => ({
                    ...prev,
                    percent,
                  }));
                }
              }
            };

            xhr.onload = () => {
              setUploadProgress(prev => ({
                ...prev,
                percent: 100,
                speedText: 'Done',
              }));
              if (xhr.status >= 200 && xhr.status < 300) {
                successCount++;
                resolve();
              } else {
                let errorMsg = `Upload failed with status ${xhr.status}`;
                try {
                  const parsed = JSON.parse(xhr.responseText);
                  if (parsed && parsed.error) errorMsg = parsed.error;
                } catch (e) {}
                failCount++;
                reject(new Error(errorMsg));
              }
            };

            xhr.onerror = (e) => {
              failCount++;
              reject(new Error('Network connection error while uploading.'));
            };

            const formData = new FormData();
            formData.append('song', {
              uri: String(currentFile.uri),
              name: String(currentFile.name),
              type: String(currentFile.type),
            });

            xhr.send(formData);
          });
        } catch (err) {
          console.error(`Error uploading ${currentFile.name}:`, err);
        }
      }

      setUploadProgress({
        uploading: false,
        currentIndex: 0,
        totalFiles: 0,
        fileName: '',
        percent: 0,
        speedText: '',
      });

      if (successCount > 0) {
        fetchSongs();
        if (totalFiles === 1) {
          Alert.alert('Upload complete', `${validAssets[0].name} was added to the library.`);
        } else {
          Alert.alert('Upload complete', `${successCount} of ${totalFiles} songs uploaded successfully.`);
        }
      } else if (failCount > 0) {
        Alert.alert('Upload failed', 'Failed to upload selected file(s).');
      }
    } catch (error) {
      setUploadProgress({
        uploading: false,
        currentIndex: 0,
        totalFiles: 0,
        fileName: '',
        percent: 0,
        speedText: '',
      });
      console.error('Upload error:', error);
      Alert.alert('Upload failed', error.message || 'Unable to upload the selected song.');
    }
  };

  if (auth.authLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>Restoring session...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const handleServerUrlChange = (url) => {
    setBackendUrl(url);
    auth.setBackendUrlRef(url);
  };

  if (!auth.isAuthenticated) {
    return (
      <SafeAreaProvider>
        <AuthScreen
          mode={auth.authMode}
          error={auth.authError}
          loading={auth.authLoading}
          backendUrl={backendUrl}
          onServerUrlChange={handleServerUrlChange}
          onModeChange={auth.setAuthMode}
          onLogin={auth.login}
          onRegister={auth.register}
        />
      </SafeAreaProvider>
    );
  }

  if (view === 'player') {
    return (
      <SafeAreaProvider>
        <PlayerView
          currentSong={currentSong}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          isLiked={isSongLiked(currentSong)}
          repeatMode={repeatMode}
          isShuffle={isShuffle}
          onToggleRepeatMode={toggleRepeatMode}
          onToggleShuffle={toggleShuffle}
          onTogglePlayPause={togglePlayPause}
          onNext={playNextSong}
          onPrevious={playPreviousSong}
          onSeek={seekTo}
          onToggleLike={toggleLikeSong}
          onClose={() => setView('home')}
          onAddToPlaylist={openAddToPlaylistModal}
          onDownloadSong={handleDownloadSong}
          onDeleteSong={handleDeleteSong}
          backendUrl={backendUrl}
          isLandscape={isLandscape}
          topInset={topInset}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#07090E" />
        <View style={[styles.container, { paddingTop: topInset, paddingHorizontal: isLandscape ? 18 : 20 }]}>
          
          {/* Playlist Detail View */}
          {selectedPlaylist ? (
            <View style={{ flex: 1 }}>
              <View style={styles.playlistDetailHeader}>
                <TouchableOpacity onPress={() => setSelectedPlaylist(null)} style={styles.glassHeaderBtn} hitSlop={10}>
                  <ChevronLeft color="#F8FAFC" size={24} />
                </TouchableOpacity>
                <Text style={styles.playlistDetailTitle} numberOfLines={1}>{selectedPlaylist.name}</Text>
                <TouchableOpacity onPress={() => handleDeletePlaylist(selectedPlaylist.id)} style={styles.glassHeaderBtn} hitSlop={10}>
                  <Trash2 color="#EF4444" size={20} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={selectedPlaylistSongs}
                keyExtractor={(item) => getSongId(item)}
                contentContainerStyle={{ paddingBottom: currentSong ? 170 : 110, paddingTop: 12 }}
                renderItem={({ item, index }) => (
                  <SongRow
                    song={item}
                    index={index}
                    isPlaying={isPlaying && getSongId(currentSong) === getSongId(item)}
                    isLiked={isSongLiked(item)}
                    onPlay={() => handlePlaySongWithTracking(item)}
                    onLike={() => toggleLikeSong(item)}
                    onDelete={() => removeSongFromPlaylist(selectedPlaylist.id, getSongId(item))}
                    backendUrl={backendUrl}
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.emptyListContainer}>
                    <Text style={styles.emptyListText}>No songs in this playlist yet.</Text>
                  </View>
                }
              />
            </View>
          ) : (
            /* Main Content Tabs */
            <View style={{ flex: 1 }}>
              
              {/* Tab 1: HOME (Favorites & Recently Played) */}
              {activeTab === 'home' && (
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: currentSong ? 170 : 110 }}
                >
                  {/* Top Bar */}
                  <View style={[styles.header, { marginTop: isLandscape ? 0 : 4, marginBottom: isLandscape ? 12 : 20 }]}>
                    <TouchableOpacity onPress={openSettings} style={styles.glassHeaderBtn} hitSlop={8}>
                      <Menu color="#F8FAFC" size={20} />
                    </TouchableOpacity>

                    <View style={styles.serverCapsulePill}>
                      <View style={styles.pulseDotGreen} />
                      <Text style={styles.currentUrl} numberOfLines={1}>NODE ONLINE</Text>
                    </View>

                    <TouchableOpacity onPress={handleResyncLibrary} disabled={loading} style={styles.glassHeaderBtn} hitSlop={8}>
                      <RefreshCw color="#A78BFA" size={18} />
                    </TouchableOpacity>
                  </View>

                  {/* Hero Music Deck Banner */}
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.25)', 'rgba(99, 102, 241, 0.1)', 'rgba(15, 17, 26, 0.8)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroDeckBanner}
                  >
                    <View style={styles.heroContentLeft}>
                      <Text style={styles.heroSubTag}>WELCOME BACK</Text>
                      <Text style={styles.greeting}>{auth.user?.username || 'Santhosh'}</Text>
                      <Text style={styles.subGreeting}>High-Fidelity Audio Network</Text>
                    </View>
                    <View style={styles.heroBadgePill}>
                      <Disc color="#A78BFA" size={24} />
                      <Text style={styles.heroBadgeCount}>{songs.length} Tracks</Text>
                    </View>
                  </LinearGradient>

                  {/* Search Input Bar */}
                  <View style={styles.searchContainer}>
                    <BlurView intensity={35} tint="dark" style={styles.searchBlurObsidian}>
                      <Search color="#94A3B8" size={18} style={styles.searchIcon} />
                      <TextInput
                        placeholder="Search songs, artists, or genres..."
                        placeholderTextColor="#64748B"
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                    </BlurView>
                  </View>

                  {/* Recently Played Section */}
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Clock color="#A78BFA" size={18} />
                      <Text style={styles.sectionTitleNoMargin}>Recently Played</Text>
                    </View>
                  </View>
                  {recentlyPlayed.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playlistScroll}>
                      {recentlyPlayed.map((item, index) => (
                        <TouchableOpacity 
                          key={index}
                          style={styles.recentCardGlass}
                          onPress={() => handlePlaySongWithTracking(item)}
                          activeOpacity={0.85}
                        >
                          <Image source={{ uri: getCoverUrl(item, backendUrl) }} style={styles.recentImage} />
                          <Text style={styles.recentTitle} numberOfLines={1}>{getSongTitle(item)}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyListContainer}>
                      <Text style={styles.emptyListText}>No tracks played recently.</Text>
                    </View>
                  )}

                  {/* Favorite / Liked Songs Carousel */}
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Heart color="#F43F5E" size={18} fill="#F43F5E" />
                      <Text style={styles.sectionTitleNoMargin}>Favorite Tracks</Text>
                    </View>
                  </View>
                  {likedSongItems.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playlistScroll}>
                      {likedSongItems.map((item, index) => (
                        <PlaylistCard
                          key={index}
                          song={item}
                          onPlay={() => handlePlaySongWithTracking(item)}
                          backendUrl={backendUrl}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyListContainer}>
                      <Text style={styles.emptyListText}>No favorite tracks yet. Tap heart on any track!</Text>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Tab 2: ALL SONGS (Library & Upload) */}
              {activeTab === 'songs' && (
                <FlatList
                  data={filteredSongs}
                  keyExtractor={(item) => getSongId(item)}
                  contentContainerStyle={{ paddingBottom: currentSong ? 170 : 110 }}
                  ListHeaderComponent={
                    <View>
                      <View style={[styles.header, { marginTop: isLandscape ? 0 : 4, marginBottom: isLandscape ? 12 : 20 }]}>
                        <TouchableOpacity onPress={openSettings} style={styles.glassHeaderBtn} hitSlop={8}>
                          <Menu color="#F8FAFC" size={20} />
                        </TouchableOpacity>
                        <Text style={styles.headerTabTitle}>All Songs ({songs.length})</Text>
                        <TouchableOpacity onPress={pickAndUploadSong} disabled={uploading} style={styles.glassHeaderBtn} hitSlop={8}>
                          <Upload color="#A78BFA" size={18} />
                        </TouchableOpacity>
                      </View>

                      {/* Luxury Upload Banner Card */}
                      <View style={styles.uploadRow}>
                        <View style={styles.uploadCardObsidian}>
                          <View style={styles.uploadCardHeader}>
                            <View style={styles.uploadCopy}>
                              <Text style={styles.uploadLabel}>Add Audio Files</Text>
                              <Text style={styles.uploadHint}>Upload MP3s from your device to stream on your server node.</Text>
                            </View>
                            <TouchableOpacity
                              onPress={pickAndUploadSong}
                              disabled={uploading || loading}
                              activeOpacity={0.85}
                            >
                              <LinearGradient
                                colors={['#8B5CF6', '#6366F1']}
                                style={[styles.uploadButtonGradient, uploading && { opacity: 0.7 }]}
                              >
                                {uploading ? (
                                  <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                  <Upload color="#FFFFFF" size={17} />
                                )}
                                <Text style={styles.uploadButtonText}>
                                  {uploading ? 'Uploading...' : 'Upload'}
                                </Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>

                          {uploadProgress.uploading && (
                            <View style={styles.uploadProgressContainer}>
                              <View style={styles.uploadProgressHeader}>
                                <Text style={styles.uploadProgressTitle} numberOfLines={1}>
                                  Uploading {uploadProgress.totalFiles > 1 ? `(${uploadProgress.currentIndex}/${uploadProgress.totalFiles}) ` : ''}{uploadProgress.fileName}
                                </Text>
                                <Text style={styles.uploadProgressSpeed}>
                                  {uploadProgress.percent}%{uploadProgress.speedText ? ` • ${uploadProgress.speedText}` : ''}
                                </Text>
                              </View>
                              <View style={styles.progressBarTrack}>
                                <View style={[styles.progressBarFill, { width: `${uploadProgress.percent}%` }]} />
                              </View>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Search & Filter */}
                      <View style={styles.searchContainer}>
                        <BlurView intensity={35} tint="dark" style={styles.searchBlurObsidian}>
                          <Search color="#94A3B8" size={18} style={styles.searchIcon} />
                          <TextInput
                            placeholder="Search all songs..."
                            placeholderTextColor="#64748B"
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                          />
                        </BlurView>
                      </View>

                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitleNoMargin}>Library Tracks</Text>
                        <View style={styles.filterPillsContainer}>
                          <TouchableOpacity
                            style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
                            onPress={() => setFilter('all')}
                          >
                            <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>All</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.filterBtn, filter === 'liked' && styles.filterBtnActive]}
                            onPress={() => setFilter('liked')}
                          >
                            <Text style={[styles.filterBtnText, filter === 'liked' && styles.filterBtnTextActive]}>Liked</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  }
                  renderItem={({ item, index }) => (
                    <SongRow
                      song={item}
                      index={index}
                      isPlaying={isPlaying && getSongId(currentSong) === getSongId(item)}
                      isLiked={isSongLiked(item)}
                      onPlay={() => handlePlaySongWithTracking(item)}
                      onLike={() => toggleLikeSong(item)}
                      onAddClick={() => openAddToPlaylistModal(item)}
                      backendUrl={backendUrl}
                    />
                  )}
                  ListEmptyComponent={
                    loading ? (
                      <View style={styles.centered}>
                        <ActivityIndicator color="#A78BFA" size="large" />
                      </View>
                    ) : (
                      <View style={styles.emptyListContainer}>
                        <Text style={styles.emptyListText}>No songs found.</Text>
                      </View>
                    )
                  }
                />
              )}

              {/* Tab 3: PLAYLISTS */}
              {activeTab === 'playlists' && (
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: currentSong ? 170 : 110 }}
                >
                  <View style={[styles.header, { marginTop: isLandscape ? 0 : 4, marginBottom: isLandscape ? 14 : 20 }]}>
                    <Text style={styles.greeting}>Playlists</Text>
                    <TouchableOpacity 
                      onPress={() => setShowCreatePlaylist(true)}
                      activeOpacity={0.85}
                    >
                      <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.createPlaylistBtnGradient}>
                        <Plus color="#FFFFFF" size={17} />
                        <Text style={styles.createPlaylistBtnText}>New</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {playlists.length > 0 ? (
                    <View style={styles.playlistGrid}>
                      {playlists.map((playlist) => (
                        <TouchableOpacity
                          key={playlist.id}
                          style={styles.playlistGridCardObsidian}
                          onPress={() => setSelectedPlaylist(playlist)}
                          activeOpacity={0.85}
                        >
                          <View style={styles.playlistGridCoverPill}>
                            <ListMusic color="#A78BFA" size={28} />
                          </View>
                          <Text style={styles.playlistGridTitle} numberOfLines={1}>{playlist.name}</Text>
                          <Text style={styles.playlistGridCount}>{playlist.songs?.length || 0} tracks</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyListContainer}>
                      <Text style={styles.emptyListText}>No playlists created yet.</Text>
                    </View>
                  )}
                </ScrollView>
              )}

            </View>
          )}

          {/* Floating MiniPlayer */}
          {currentSong && (
            <MiniPlayer
              currentSong={currentSong}
              isPlaying={isPlaying}
              position={position}
              duration={duration}
              isLiked={isSongLiked(currentSong)}
              onTogglePlayPause={togglePlayPause}
              onOpenPlayer={() => setView('player')}
              onToggleLike={toggleLikeSong}
              backendUrl={backendUrl}
            />
          )}

          {/* Bespoke Floating Bottom Navigation Bar */}
          <BlurView intensity={90} tint="dark" style={styles.floatingBottomNav}>
            <TouchableOpacity 
              style={[styles.navTab, activeTab === 'home' && !selectedPlaylist && styles.navTabActive]} 
              onPress={() => {
                setSelectedPlaylist(null);
                setActiveTab('home');
              }}
              activeOpacity={0.8}
            >
              <Home color={activeTab === 'home' && !selectedPlaylist ? '#A78BFA' : '#64748B'} size={20} />
              <Text style={[styles.navText, activeTab === 'home' && !selectedPlaylist && styles.navTextActive]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navTab, activeTab === 'songs' && !selectedPlaylist && styles.navTabActive]} 
              onPress={() => {
                setSelectedPlaylist(null);
                setActiveTab('songs');
              }}
              activeOpacity={0.8}
            >
              <Disc color={activeTab === 'songs' && !selectedPlaylist ? '#A78BFA' : '#64748B'} size={20} />
              <Text style={[styles.navText, activeTab === 'songs' && !selectedPlaylist && styles.navTextActive]}>Songs</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navTab, (activeTab === 'playlists' || selectedPlaylist) && styles.navTabActive]} 
              onPress={() => {
                setActiveTab('playlists');
              }}
              activeOpacity={0.8}
            >
              <ListMusic color={activeTab === 'playlists' || selectedPlaylist ? '#A78BFA' : '#64748B'} size={20} />
              <Text style={[styles.navText, (activeTab === 'playlists' || selectedPlaylist) && styles.navTextActive]}>Playlists</Text>
            </TouchableOpacity>
          </BlurView>

        </View>

        {/* Modals */}
        <SettingsModal
          visible={showSettings}
          tempUrl={tempUrl}
          backendUrl={tempUrl}
          onUrlChange={setTempUrl}
          onChangeUrl={setTempUrl}
          onSave={saveSettings}
          onCancel={() => setShowSettings(false)}
          onClose={() => setShowSettings(false)}
          onTest={handleTestConnection}
          onTestConnection={handleTestConnection}
          onLogout={auth.logout}
          currentUser={auth.user}
        />

        <CreatePlaylistModal
          visible={showCreatePlaylist}
          name={newPlaylistName}
          playlistName={newPlaylistName}
          onNameChange={setNewPlaylistName}
          onChangeName={setNewPlaylistName}
          onCreate={handleCreatePlaylist}
          onCancel={() => setShowCreatePlaylist(false)}
          onClose={() => setShowCreatePlaylist(false)}
        />

        <AddToPlaylistModal
          visible={showAddToPlaylist}
          playlists={playlists}
          song={songToAddToPlaylist}
          onSelect={handleAddSongToPlaylist}
          onSelectPlaylist={handleAddSongToPlaylist}
          onCreateNew={() => {
            setShowAddToPlaylist(false);
            setShowCreatePlaylist(true);
          }}
          onCreatePlaylist={() => {
            setShowAddToPlaylist(false);
            setShowCreatePlaylist(true);
          }}
          onClose={() => setShowAddToPlaylist(false)}
          onCancel={() => setShowAddToPlaylist(false)}
        />

        <AddSongsToPlaylistModal
          visible={showAddSongsToPlaylist}
          songs={songs.filter(s => !(selectedPlaylist?.songs || []).some(ps => getSongId(ps) === getSongId(s)))}
          onAdd={handleBatchAddSongToSelectedPlaylist}
          onCancel={() => setShowAddSongsToPlaylist(false)}
          onClose={() => setShowAddSongsToPlaylist(false)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07090E',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glassHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  serverCapsulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  pulseDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  currentUrl: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTabTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  heroDeckBanner: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  heroContentLeft: {
    flex: 1,
    marginRight: 12,
  },
  heroSubTag: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  greeting: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
  },
  subGreeting: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  heroBadgePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroBadgeCount: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  searchContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  searchBlurObsidian: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: 'rgba(15, 17, 26, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  sectionTitleNoMargin: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  playlistScroll: {
    marginBottom: 24,
  },
  recentCardGlass: {
    width: 120,
    marginRight: 14,
    padding: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 17, 26, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recentImage: {
    width: 104,
    height: 104,
    borderRadius: 14,
    marginBottom: 8,
  },
  recentTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyListContainer: {
    padding: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyListText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  uploadRow: {
    marginBottom: 20,
  },
  uploadCardObsidian: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(15, 17, 26, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  uploadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  uploadCopy: {
    flex: 1,
  },
  uploadLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  uploadHint: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  uploadButtonGradient: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  uploadProgressContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  uploadProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadProgressTitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  uploadProgressSpeed: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  filterPillsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 9,
  },
  filterBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  filterBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  createPlaylistBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    elevation: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  createPlaylistBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 6,
  },
  playlistGridCardObsidian: {
    width: '47.5%',
    backgroundColor: 'rgba(15, 17, 26, 0.75)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  playlistGridCoverPill: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  playlistGridTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  playlistGridCount: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  playlistDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  playlistDetailTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    marginHorizontal: 12,
  },
  floatingBottomNav: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    right: 14,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(11, 13, 20, 0.92)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    elevation: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    zIndex: 99,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 20,
  },
  navTabActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    marginHorizontal: 10,
  },
  navText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#A78BFA',
    fontWeight: '800',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 10,
  },
});