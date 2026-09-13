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
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
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

// Components
import { MiniPlayer } from './components/MiniPlayer';
import { SongRow } from './components/SongRow';
import { PlaylistCard } from './components/PlaylistCard';
import { PlayerView } from './screens/PlayerView';
import { SettingsModal, CreatePlaylistModal, AddToPlaylistModal } from './components/Modals';

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

export default function App() {
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
  } = useSongs(getDefaultBackendUrl());
  
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
  } = usePlaylists(backendUrl);

  const { 
    likedSongs, 
    toggleLikeSong, 
    isSongLiked 
  } = useLikedSongs();

  // Local UI state
  const [view, setView] = useState('home'); // 'home' or 'player'
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' or 'liked'
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [uploading, setUploading] = useState(false);
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
    // Only auto-fetch on mount if we already have a configured URL
    const initialUrl = getDefaultBackendUrl();
    if (initialUrl) {
      fetchSongs(initialUrl);
      fetchPlaylists(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

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
      fetchSongs(tempUrl.trim());
      fetchPlaylists(tempUrl.trim());
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
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = (result.assets && result.assets[0]) || result;
      if (!asset) {
        Alert.alert('Upload failed', 'No file was selected.');
        return;
      }

      const fileUri = asset.uri || asset.file?.uri || result.uri;
      if (!fileUri || typeof fileUri !== 'string') {
        Alert.alert('Upload failed', 'Could not obtain valid file location from picker.');
        return;
      }

      let fileName = asset.name || 'song.mp3';
      const rawMime = (asset.mimeType || '').toLowerCase();

      const audioExts = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.oga'];
      const fileExt = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : '';
      const hasAudioExt = audioExts.includes(fileExt);
      const isAudioMime = rawMime.startsWith('audio/') || rawMime === 'application/octet-stream' || rawMime === '';

      if (!hasAudioExt && !isAudioMime) {
        Alert.alert('Unsupported file', 'Please select a valid audio file (.mp3, .m4a, .wav, etc.).');
        return;
      }

      if (!hasAudioExt) {
        fileName = `${fileName}.mp3`;
      }

      const mimeType = rawMime.startsWith('audio/') ? rawMime : 'audio/mpeg';

      setUploading(true);

      if (Platform.OS !== 'web') {
        // Native mobile upload using Expo FileSystem native binary/multipart module (bypasses FormData JS errors)
        const uploadResult = await FileSystem.uploadAsync(
          `${safeBaseUrl}/upload`,
          fileUri,
          {
            fieldName: 'song',
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            mimeType: mimeType,
            parameters: {
              name: fileName,
            },
          }
        );

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          let errorMsg = `Upload failed with status ${uploadResult.status}`;
          try {
            const parsed = JSON.parse(uploadResult.body);
            if (parsed && parsed.error) errorMsg = parsed.error;
          } catch (e) {}
          throw new Error(errorMsg);
        }
      } else {
        // Web fallback
        const formData = new FormData();
        formData.append('song', {
          uri: String(fileUri),
          name: String(fileName),
          type: String(mimeType),
        });

        const response = await fetch(`${safeBaseUrl}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || `Upload failed with status ${response.status}`);
        }
      }

      Alert.alert('Upload complete', `${fileName} was added to the library.`);
      fetchSongs();
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload failed', error.message || 'Unable to upload the selected song.');
    } finally {
      setUploading(false);
    }
  };

  if (view === 'player') {
    return (
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
    );
  }

  return (
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
                <View style={{ width: 24 }} />
              </View>

              <Text style={styles.greeting}>Hello <Text style={styles.bold}>Santhosh</Text></Text>
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
                  <View style={styles.uploadCopy}>
                    <Text style={styles.uploadLabel}>Add music</Text>
                    <Text style={styles.uploadHint}>Upload an MP3 from your device to stream it on the LAN server.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
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