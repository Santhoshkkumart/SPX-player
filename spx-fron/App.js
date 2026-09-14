import React, { useEffect, useState, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Search, 
  Menu, 
  Plus,
  Trash2,
  ChevronLeft,
  Upload,
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
import { SettingsModal, CreatePlaylistModal, AddToPlaylistModal } from './components/Modals';
import { AuthScreen } from './components/AuthScreen';

// Utils
import { 
  getSongTitle, 
  getSongId, 
  getCoverUrl, 
  getPlaybackQueue, 
  getSongIndex,
  sanitizeBaseUrl 
} from './utils/helpers';
import { DEFAULT_BACKEND_URL, ANDROID_EMULATOR_URL } from './utils/constants';

const getDefaultBackendUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (typeof configuredUrl === 'string' && configuredUrl.trim()) {
    return sanitizeBaseUrl(configuredUrl);
  }
  return DEFAULT_BACKEND_URL;
};

function App() {
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
    currentSong, 
    isPlaying, 
    isBuffering, 
    position, 
    duration, 
    audioError, 
    handlePlaySong, 
    togglePlayPause, 
    seekTo,
    setCurrentSong
  } = useAudio(backendUrl);

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

  // Local UI state
  const [view, setView] = useState('home'); // 'home' or 'player'
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' or 'liked'
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

  // Derived state
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = getSongTitle(song).toLowerCase().includes(searchQuery.toLowerCase());
      if (filter === 'liked') {
        return matchesSearch && isSongLiked(song);
      }
      return matchesSearch;
    });
  }, [songs, searchQuery, filter, isSongLiked]);

  const playbackQueue = useMemo(() => {
    return getPlaybackQueue(songs, filteredSongs, currentSong, filter, searchQuery);
  }, [songs, filteredSongs, currentSong, filter, searchQuery]);

  const likedSongItems = useMemo(() => {
    return songs.filter(song => isSongLiked(song));
  }, [songs, isSongLiked]);

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
    const onBackPress = () => {
      if (showSettings) { setShowSettings(false); return true; }
      if (showCreatePlaylist) { setShowCreatePlaylist(false); return true; }
      if (showAddToPlaylist) { setShowAddToPlaylist(false); return true; }
      if (selectedPlaylist) { setSelectedPlaylist(null); return true; }
      if (view === 'player') { setView('home'); return true; }
      return false; // Exit app if at home
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [showSettings, showCreatePlaylist, showAddToPlaylist, selectedPlaylist, view]);

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
        Alert.alert('Error', 'Server responded but may not be Pulse Player server');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server');
    }
  };

  const handleCreatePlaylist = async () => {
    const success = await createPlaylist(newPlaylistName);
    if (success) {
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
    }
  };

  const handleDeletePlaylist = (id) => {
    Alert.alert('Delete Playlist', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', onPress: () => deletePlaylist(id).then(() => setSelectedPlaylist(null)), style: 'destructive' }
    ]);
  };

  const handleAddSongToPlaylist = async (playlistId) => {
    const success = await addSongToPlaylist(playlistId, getSongId(songToAddToPlaylist));
    if (success) {
      setShowAddToPlaylist(false);
      setSongToAddToPlaylist(null);
    }
  };

  const playNextSong = () => {
    if (!playbackQueue.length) return;
    const currentIndex = getSongIndex(playbackQueue, currentSong);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % playbackQueue.length;
    handlePlaySong(playbackQueue[nextIndex]);
  };

  const playPreviousSong = () => {
    if (!playbackQueue.length) return;
    const currentIndex = getSongIndex(playbackQueue, currentSong);
    const previousIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + playbackQueue.length) % playbackQueue.length;
    handlePlaySong(playbackQueue[previousIndex]);
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
        const rawMime = (asset.mimeType || '').toLowerCase();
        const fileExt = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : '';
        const hasAudioExt = audioExts.includes(fileExt);
        const isAudioMime = rawMime.startsWith('audio/') || rawMime === 'application/octet-stream' || rawMime === '';

        if (hasAudioExt || isAudioMime) {
          if (!hasAudioExt) {
            fileName = `${fileName}.mp3`;
          }
          const mimeType = rawMime.startsWith('audio/') ? rawMime : 'audio/mpeg';
          validAssets.push({ uri: fileUri, name: fileName, type: mimeType });
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
                const percent = Math.round((event.loaded / event.total) * 100);
                const now = Date.now();
                const timeDiff = (now - lastTime) / 1000;

                if (timeDiff >= 0.25 || event.loaded === event.total) {
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
            <ActivityIndicator size="large" color="#fff" />
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
          onTogglePlayPause={togglePlayPause}
          onNext={playNextSong}
          onPrevious={playPreviousSong}
          onSeek={seekTo}
          onToggleLike={toggleLikeSong}
          onClose={() => setView('home')}
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
      <StatusBar barStyle="light-content" />
      <View style={[styles.container, { paddingTop: topInset, paddingHorizontal: isLandscape ? 18 : 24 }]}>
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => getSongId(item)}
          ListHeaderComponent={
            <View>
              <View style={[styles.header, { marginTop: isLandscape ? 0 : 8, marginBottom: isLandscape ? 14 : 22 }]}>
                <TouchableOpacity onPress={openSettings}>
                  <Menu color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.currentUrl} numberOfLines={1}>{backendUrl}</Text>
                <TouchableOpacity onPress={pickAndUploadSong} disabled={uploading}>
                  <Upload color="#38bdf8" size={22} />
                </TouchableOpacity>
              </View>

              <Text style={styles.greeting}>Hello <Text style={styles.bold}>{auth.user?.username || 'Santhosh'}</Text></Text>
              <Text style={styles.subGreeting}>Find the best music for today</Text>

              <View style={styles.searchContainer}>
                <BlurView intensity={20} tint="light" style={styles.searchBlur}>
                  <Search color="#94a3b8" size={20} style={styles.searchIcon} />
                  <TextInput
                    placeholder="Looking for ..."
                    placeholderTextColor="#94a3b8"
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </BlurView>
              </View>

              <View style={styles.uploadRow}>
                <View style={styles.uploadCard}>
                  <View style={styles.uploadCardHeader}>
                    <View style={styles.uploadCopy}>
                      <Text style={styles.uploadLabel}>Add music</Text>
                      <Text style={styles.uploadHint}>Upload MP3s from your device to stream on the LAN server.</Text>
                    </View>
                    <TouchableOpacity
                      onPress={pickAndUploadSong}
                      style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                      disabled={uploading || loading}
                      activeOpacity={0.85}
                    >
                      {uploading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Upload color="#fff" size={18} />
                      )}
                      <Text style={styles.uploadButtonText}>
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Text>
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

              <Text style={styles.sectionTitle}>Popular Playlist</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playlistScroll}>
                {loading ? (
                  <View style={styles.loadingCard}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : filteredSongs.length > 0 ? (
                  filteredSongs.slice(0, 3).map((item, index) => (
                    <PlaylistCard 
                      key={index}
                      song={item}
                      onPlay={handlePlaySong}
                      backendUrl={backendUrl}
                    />
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>None</Text>
                  </View>
                )}
              </ScrollView>

              <Text style={styles.sectionTitle}>Liked Songs</Text>
              {likedSongItems.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playlistScroll}>
                  {likedSongItems.map((item, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={styles.likedCard}
                      onPress={() => handlePlaySong(item)}
                    >
                      <Image source={{ uri: getCoverUrl(item, backendUrl) }} style={styles.likedImage} />
                      <Text style={styles.likedTitle} numberOfLines={1}>{getSongTitle(item)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyListContainer}>
                  <Text style={styles.emptyListText}>No liked songs yet.</Text>
                </View>
              )}

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>My Playlists</Text>
                <TouchableOpacity onPress={() => setShowCreatePlaylist(true)}>
                  <Plus color="#fff" size={24} />
                </TouchableOpacity>
              </View>
              {playlists.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playlistScroll}>
                  {playlists.map((item, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={styles.likedCard}
                      onPress={() => setSelectedPlaylist(item)}
                    >
                      <View style={styles.playlistIconBg}>
                        <Menu color="#fff" size={32} />
                      </View>
                      <Text style={styles.likedTitle} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyListContainer}>
                  <Text style={styles.emptyListText}>No playlists created yet.</Text>
                </View>
              )}

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {filter === 'liked' ? 'My Liked Songs' : 'Recently Played'}
                </Text>
                <View style={styles.filterContainer}>
                  <TouchableOpacity 
                    onPress={() => setFilter('all')}
                    style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setFilter('liked')}
                    style={[styles.filterBtn, filter === 'liked' && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterBtnText, filter === 'liked' && styles.filterBtnTextActive]}>Liked</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {!backendUrl && !loading && (
                <View style={styles.centered}>
                  <Text style={styles.errorText}>Server not configured</Text>
                  <Text style={styles.hintText}>
                    {'Enter your server\'s LAN IP address in Settings to start streaming.\nExample: http://192.168.1.x:3000'}
                  </Text>
                  <TouchableOpacity style={[styles.retryBtn, { backgroundColor: 'rgba(99,102,241,0.5)' }]} onPress={openSettings}>
                    <Text style={styles.retryText}>Open Settings</Text>
                  </TouchableOpacity>
                </View>
              )}

              {loading && (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.loadingText}>Connecting...</Text>
                </View>
              )}
              
              {fetchError && !loading && (
                <View style={styles.centered}>
                  <Text style={styles.errorText}>{fetchError}</Text>
                  {!backendUrl && (
                    <Text style={styles.hintText}>
                      Tap the menu icon ☰ above to open Settings and enter your server's LAN IP address (e.g. http://192.168.1.x:3000)
                    </Text>
                  )}
                  <TouchableOpacity style={styles.retryBtn} onPress={() => fetchSongs()}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.retryBtn, { marginTop: 8, backgroundColor: 'rgba(99,102,241,0.4)' }]} onPress={openSettings}>
                    <Text style={styles.retryText}>Open Settings</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <SongRow 
              song={item}
              isLiked={isSongLiked(item)}
              onPlay={handlePlaySong}
              onLike={toggleLikeSong}
              onAddClick={(song) => {
                setSongToAddToPlaylist(song);
                setShowAddToPlaylist(true);
              }}
              backendUrl={backendUrl}
            />
          )}
          ListEmptyComponent={
            !loading && !fetchError ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>{searchQuery ? 'No songs match your search.' : 'No songs found on server.'}</Text>
              </View>
          ) : null
          }
          contentContainerStyle={{ paddingBottom: currentSong ? 180 : 120 }}
        />
      </View>

      <MiniPlayer 
        currentSong={currentSong}
        isPlaying={isPlaying}
        onTogglePlayPause={togglePlayPause}
        onPress={() => setView('player')}
        backendUrl={backendUrl}
      />

      {showSettings && (
        <SettingsModal 
          tempUrl={tempUrl}
          onUrlChange={setTempUrl}
          onTest={handleTestConnection}
          onCancel={() => setShowSettings(false)}
          onSave={saveSettings}
          defaultUrl={getDefaultBackendUrl()}
          currentUser={auth.user}
          onLogout={auth.logout}
        />
      )}

      {showCreatePlaylist && (
        <CreatePlaylistModal 
          name={newPlaylistName}
          onNameChange={setNewPlaylistName}
          onCancel={() => setShowCreatePlaylist(false)}
          onCreate={handleCreatePlaylist}
        />
      )}

      {showAddToPlaylist && (
        <AddToPlaylistModal 
          playlists={playlists}
          onSelect={handleAddSongToPlaylist}
          onClose={() => setShowAddToPlaylist(false)}
        />
      )}

      {selectedPlaylist && (
        <View style={styles.playlistDetailContainer}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.playlistDetailHeader}>
              <TouchableOpacity onPress={() => setSelectedPlaylist(null)}>
                <ChevronLeft color="#fff" size={28} />
              </TouchableOpacity>
              <Text style={styles.playlistDetailTitle}>{selectedPlaylist.name}</Text>
              <TouchableOpacity onPress={() => handleDeletePlaylist(selectedPlaylist.id)}>
                <Trash2 color="#f43f5e" size={24} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={songs.filter(s => selectedPlaylist.songs.includes(getSongId(s)))}
              keyExtractor={(item) => getSongId(item)}
              renderItem={({ item }) => (
                <SongRow 
                  song={item}
                  isLiked={isSongLiked(item)}
                  onPlay={handlePlaySong}
                  onLike={toggleLikeSong}
                  onAddClick={() => {}} // Not needed in playlist view or different action
                  backendUrl={backendUrl}
                  // Override some actions for playlist view
                  rightAction={
                    <TouchableOpacity 
                      onPress={async () => {
                        const updatedP = await removeSongFromPlaylist(selectedPlaylist.id, getSongId(item));
                        if (updatedP) setSelectedPlaylist(updatedP);
                      }}
                    >
                      <Trash2 color="#94a3b8" size={20} />
                    </TouchableOpacity>
                  }
                />
              )}
              ListEmptyComponent={<Text style={styles.emptyPlaylistText}>No songs in this playlist.</Text>}
              contentContainerStyle={{ padding: 24 }}
            />
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  currentUrl: {
    color: '#666',
    fontSize: 10,
    maxWidth: 150,
    textAlign: 'center',
  },
  greeting: {
    color: '#fff',
    fontSize: 28,
  },
  bold: {
    fontWeight: 'bold',
  },
  subGreeting: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 4,
    marginBottom: 18,
  },
  searchContainer: {
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  searchBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  uploadRow: {
    marginBottom: 20,
  },
  uploadCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'column',
  },
  uploadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  uploadProgressContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  uploadProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadProgressTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  uploadProgressSpeed: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 4,
  },
  uploadCopy: {
    flex: 1,
  },
  uploadLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadHint: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  uploadButton: {
    minHeight: 46,
    minWidth: 116,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  playlistScroll: {
    marginBottom: 20,
    flexGrow: 0,
  },
  loadingCard: {
    width: 240,
    height: 240,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  emptyCard: {
    width: 240,
    height: 240,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  likedCard: {
    width: 120,
    marginRight: 16,
  },
  likedImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginBottom: 8,
  },
  likedTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyListContainer: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginBottom: 30,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#666',
    fontSize: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 2,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
  },
  errorText: {
    color: '#fca5a5',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  hintText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  playlistIconBg: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playlistDetailContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121212',
    zIndex: 100,
  },
  playlistDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  playlistDetailTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyPlaylistText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 100,
  },
});

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#050816', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text style={{ color: '#ef4444', fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
              SPX Player Error
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
              {this.state.error?.message || this.state.error?.toString() || 'An unexpected error occurred.'}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 }}
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Try Again</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }
    return this.props.children;
  }
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}