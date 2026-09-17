import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  ChevronLeft, 
  MoreHorizontal, 
  Heart, 
  SkipBack, 
  SkipForward, 
  Repeat,
  Repeat1, 
  Shuffle,
  Volume2, 
  VolumeX,
  Play, 
  Pause,
  Download,
  Trash2,
  ListPlus,
  X,
  Sparkles
} from 'lucide-react-native';
import { getSongTitle, getSongArtist, getCoverUrl } from '../utils/helpers';
import { ProgressBar } from '../components/ProgressBar';

const { width } = Dimensions.get('window');
const isCompactDevice = width < 380;

export function PlayerView({
  currentSong,
  isPlaying,
  position,
  duration,
  isLiked,
  repeatMode = 'off',
  isShuffle = false,
  onToggleRepeatMode,
  onToggleShuffle,
  onTogglePlayPause,
  onNext,
  onPrevious,
  onSeek,
  onToggleLike,
  onClose,
  onAddToPlaylist,
  onDownloadSong,
  onDeleteSong,
  backendUrl,
  isLandscape,
  topInset,
}) {
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Rotating CD animation setup
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let anim;
    if (isPlaying) {
      anim = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 14000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
    } else {
      spinAnim.stopAnimation();
    }
    return () => {
      spinAnim.stopAnimation();
    };
  }, [isPlaying]);

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!currentSong) return null;

  const handleDelete = () => {
    setShowOptionsModal(false);
    Alert.alert(
      'Delete Song',
      `Are you sure you want to delete "${getSongTitle(currentSong)}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            if (onDeleteSong) onDeleteSong(currentSong);
            onClose();
          } 
        },
      ]
    );
  };

  const handleDownload = () => {
    setShowOptionsModal(false);
    if (onDownloadSong) {
      onDownloadSong(currentSong);
    }
  };

  const handlePlaylistAdd = () => {
    setShowOptionsModal(false);
    if (onAddToPlaylist) {
      onAddToPlaylist(currentSong);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#07090E' }}>
      <ImageBackground 
        source={{ uri: getCoverUrl(currentSong, backendUrl) }} 
        style={styles.playerBackground}
        blurRadius={65}
      >
        <LinearGradient
          colors={['rgba(7, 9, 14, 0.45)', 'rgba(7, 9, 14, 0.88)', '#07090E']}
          style={styles.playerOverlay}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.playerScrollContent,
                { paddingTop: topInset, paddingHorizontal: isLandscape ? 18 : 24, paddingBottom: isLandscape ? 16 : 24 },
              ]}
            >
              {/* Top Navigation Bar */}
              <View style={[styles.playerHeader, { marginTop: isLandscape ? 0 : 4 }]}>
                <TouchableOpacity onPress={onClose} style={styles.glassHeaderBtn} hitSlop={10}>
                  <ChevronLeft color="#F8FAFC" size={24} />
                </TouchableOpacity>
                <View style={styles.headerTagPill}>
                  <Sparkles color="#A78BFA" size={12} style={{ marginRight: 6 }} />
                  <Text style={styles.nowPlayingText}>SPX HI-FI DECK</Text>
                </View>
                <TouchableOpacity onPress={() => setShowOptionsModal(true)} style={styles.glassHeaderBtn} hitSlop={10}>
                  <MoreHorizontal color="#F8FAFC" size={24} />
                </TouchableOpacity>
              </View>

              {/* Vinyl CD Album Art Deck */}
              <View style={[
                styles.albumArtContainer,
                {
                  marginTop: isLandscape ? 12 : 28,
                  width: isLandscape ? 210 : Math.min(width - 64, 320),
                  height: isLandscape ? 210 : Math.min(width - 64, 320),
                  alignSelf: 'center',
                }
              ]}>
                {/* Glowing Ambient Light Backing */}
                <View style={styles.glowHalo} />
                
                <Animated.View 
                  style={[
                    styles.cdWrapper,
                    { transform: [{ rotate: spinInterpolation }] }
                  ]}
                >
                  <View style={styles.vinylDisc}>
                    {/* Concentric Vinyl Groove Rings */}
                    <View style={styles.vinylGrooveRing1} pointerEvents="none" />
                    <View style={styles.vinylGrooveRing2} pointerEvents="none" />
                    <View style={styles.vinylGrooveRing3} pointerEvents="none" />

                    {/* Centered Album Cover Label */}
                    <View style={styles.vinylCenterLabelWrapper}>
                      <Image source={{ uri: getCoverUrl(currentSong, backendUrl) }} style={styles.vinylCoverCenter} />
                    </View>

                    {/* Spindle Hub */}
                    <View style={styles.vinylSpindleRing} pointerEvents="none">
                      <View style={styles.vinylCenterHole} />
                    </View>
                  </View>
                </Animated.View>

                {/* Stylized Tonearm Overlay */}
                <View style={styles.tonearmArm} pointerEvents="none" />
                <View style={styles.tonearmHead} pointerEvents="none" />
                <View style={styles.tonearmPivot} pointerEvents="none" />
              </View>

              {/* Track Metadata Info */}
              <View style={[styles.playerMeta, { marginTop: isLandscape ? 16 : 28 }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.playerTitle, { fontSize: isLandscape ? 20 : (isCompactDevice ? 22 : 25) }]} numberOfLines={1}>
                    {getSongTitle(currentSong)}
                  </Text>
                  <Text style={[styles.playerArtist, { fontSize: isLandscape ? 13 : (isCompactDevice ? 14 : 16) }]}>
                    {getSongArtist(currentSong)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => onToggleLike(currentSong)} style={styles.likeBtnOrb} activeOpacity={0.8}>
                  <Heart 
                    fill={isLiked ? "#F43F5E" : "transparent"} 
                    color={isLiked ? "#F43F5E" : "#94A3B8"} 
                    size={22} 
                  />
                </TouchableOpacity>
              </View>

              {/* Progress Slider Bar */}
              <View style={{ marginTop: isLandscape ? 12 : 20 }}>
                <ProgressBar 
                  position={position} 
                  duration={duration} 
                  onSeek={onSeek} 
                />
              </View>

              {/* Main Transport Controls */}
              <View style={[styles.mainControls, { marginTop: isLandscape ? 14 : 22 }]}>
                {/* Shuffle Button */}
                <TouchableOpacity onPress={onToggleShuffle} style={styles.modeBtn} activeOpacity={0.8}>
                  <Shuffle color={isShuffle ? "#A78BFA" : "#64748B"} size={22} />
                </TouchableOpacity>

                {/* Previous Track */}
                <TouchableOpacity onPress={onPrevious} style={styles.transportBtn} activeOpacity={0.8}>
                  <SkipBack color="#F8FAFC" size={isLandscape ? 26 : 30} fill="#F8FAFC" />
                </TouchableOpacity>

                {/* Play / Pause Gradient Orb */}
                <TouchableOpacity 
                  style={[
                    styles.mainPlayBtnWrapper, 
                    { 
                      width: isLandscape ? 64 : (isCompactDevice ? 70 : 76), 
                      height: isLandscape ? 64 : (isCompactDevice ? 70 : 76), 
                      borderRadius: isLandscape ? 32 : (isCompactDevice ? 35 : 38) 
                    }
                  ]} 
                  onPress={onTogglePlayPause}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    style={styles.mainPlayGradient}
                  >
                    {isPlaying ? (
                      <Pause color="#ffffff" size={isLandscape ? 28 : 32} fill="#ffffff" />
                    ) : (
                      <Play color="#ffffff" size={isLandscape ? 28 : 32} fill="#ffffff" style={{ marginLeft: 3 }} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Next Track */}
                <TouchableOpacity onPress={onNext} style={styles.transportBtn} activeOpacity={0.8}>
                  <SkipForward color="#F8FAFC" size={isLandscape ? 26 : 30} fill="#F8FAFC" />
                </TouchableOpacity>

                {/* Repeat Button */}
                <TouchableOpacity onPress={onToggleRepeatMode} style={styles.modeBtn} activeOpacity={0.8}>
                  {repeatMode === 'one' ? (
                    <Repeat1 color="#A78BFA" size={22} />
                  ) : (
                    <Repeat color={repeatMode === 'all' ? "#A78BFA" : "#64748B"} size={22} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Bottom Quick Actions Deck */}
              <View style={styles.footerQuickRow}>
                <TouchableOpacity onPress={() => setShowVolumeModal(true)} style={styles.footerQuickBtn} activeOpacity={0.8}>
                  {isMuted ? <VolumeX color="#F87171" size={19} /> : <Volume2 color="#A78BFA" size={19} />}
                  <Text style={styles.footerQuickText}>{isMuted ? 'Muted' : 'Volume'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDownload} style={styles.footerQuickBtn} activeOpacity={0.8}>
                  <Download color="#38BDF8" size={19} />
                  <Text style={styles.footerQuickText}>Download</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePlaylistAdd} style={styles.footerQuickBtn} activeOpacity={0.8}>
                  <ListPlus color="#10B981" size={19} />
                  <Text style={styles.footerQuickText}>Playlist</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>

      {/* More Options Modal */}
      <Modal visible={showOptionsModal} transparent animationType="slide" onRequestClose={() => setShowOptionsModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <BlurView intensity={90} tint="dark" style={styles.optionsSheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetSubtitle}>TRACK OPTIONS</Text>
                <Text style={styles.sheetTitle} numberOfLines={1}>{getSongTitle(currentSong)}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)} style={styles.sheetCloseBtn}>
                <X color="#94A3B8" size={20} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.optionRow} onPress={handlePlaylistAdd}>
              <View style={[styles.optionIconPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <ListPlus color="#10B981" size={18} />
              </View>
              <Text style={styles.optionText}>Add to Playlist</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={handleDownload}>
              <View style={[styles.optionIconPill, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Download color="#38BDF8" size={18} />
              </View>
              <Text style={styles.optionText}>Save & Download Song</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionRow, { borderBottomWidth: 0 }]} onPress={handleDelete}>
              <View style={[styles.optionIconPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Trash2 color="#EF4444" size={18} />
              </View>
              <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete Track</Text>
            </TouchableOpacity>
          </BlurView>
        </TouchableOpacity>
      </Modal>

      {/* Sound Controls Modal */}
      <Modal visible={showVolumeModal} transparent animationType="fade" onRequestClose={() => setShowVolumeModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowVolumeModal(false)}>
          <BlurView intensity={95} tint="dark" style={styles.volumeCard}>
            <Text style={styles.volumeTitle}>Audio Master</Text>
            <TouchableOpacity 
              style={styles.muteToggleBtn} 
              onPress={() => setIsMuted(prev => !prev)}
              activeOpacity={0.8}
            >
              {isMuted ? <VolumeX color="#EF4444" size={26} /> : <Volume2 color="#A78BFA" size={26} />}
              <Text style={styles.muteText}>{isMuted ? 'Muted' : 'Sound Active'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.volumeCloseBtn} onPress={() => setShowVolumeModal(false)}>
              <Text style={styles.volumeCloseText}>Close</Text>
            </TouchableOpacity>
          </BlurView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  playerBackground: {
    flex: 1,
  },
  playerOverlay: {
    flex: 1,
  },
  playerScrollContent: {
    flexGrow: 1,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glassHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  nowPlayingText: {
    color: '#A78BFA',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  albumArtContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowHalo: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderRadius: 999,
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    elevation: 30,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
  },
  cdWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vinylDisc: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#0C0D15',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.8,
    shadowRadius: 28,
  },
  vinylGrooveRing1: {
    position: 'absolute',
    width: '92%',
    height: '92%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  vinylGrooveRing2: {
    position: 'absolute',
    width: '76%',
    height: '76%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  vinylGrooveRing3: {
    position: 'absolute',
    width: '60%',
    height: '60%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  vinylCenterLabelWrapper: {
    width: '46%',
    height: '46%',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  vinylCoverCenter: {
    width: '100%',
    height: '100%',
  },
  vinylSpindleRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2338',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  vinylCenterHole: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#07090E',
  },
  tonearmArm: {
    position: 'absolute',
    top: -12,
    right: 14,
    width: 5,
    height: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    transform: [{ rotate: '-22deg' }],
    borderRadius: 3,
  },
  tonearmHead: {
    position: 'absolute',
    top: 54,
    right: 36,
    width: 13,
    height: 20,
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
    transform: [{ rotate: '-22deg' }],
  },
  tonearmPivot: {
    position: 'absolute',
    top: -18,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E2338',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerTitle: {
    color: '#F8FAFC',
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  playerArtist: {
    color: '#CBD5E1',
    marginTop: 4,
    fontWeight: '600',
  },
  likeBtnOrb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  transportBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayBtnWrapper: {
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  mainPlayGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerQuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  footerQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    gap: 8,
  },
  footerQuickText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 9, 14, 0.75)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    backgroundColor: 'rgba(15, 17, 26, 0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetSubtitle: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionIconPill: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  volumeCard: {
    backgroundColor: 'rgba(15, 17, 26, 0.95)',
    marginHorizontal: 36,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    width: 280,
  },
  volumeTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 16,
  },
  muteToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  muteText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  volumeCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  volumeCloseText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 14,
  },
});

