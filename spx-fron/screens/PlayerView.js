import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Dimensions,
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
  Volume2, 
  Play, 
  Pause 
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
  onTogglePlayPause,
  onNext,
  onPrevious,
  onSeek,
  onToggleLike,
  onClose,
  backendUrl,
  isLandscape,
  topInset,
}) {
  if (!currentSong) return null;

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground 
        source={{ uri: getCoverUrl(currentSong, backendUrl) }} 
        style={styles.playerBackground}
        blurRadius={50}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
          style={styles.playerOverlay}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.playerScrollContent,
                { paddingTop: topInset, paddingHorizontal: isLandscape ? 18 : 24, paddingBottom: isLandscape ? 16 : 20 },
              ]}
            >
              <View style={[styles.playerHeader, { marginTop: isLandscape ? 0 : 4, marginBottom: isLandscape ? 10 : 0 }]}>
                <TouchableOpacity onPress={onClose}>
                  <ChevronLeft color="#fff" size={isCompactDevice ? 26 : 28} />
                </TouchableOpacity>
                <Text style={[styles.nowPlayingText, { fontSize: isLandscape ? 16 : (isCompactDevice ? 16 : 18) }]}>Now Playing</Text>
                <MoreHorizontal color="#fff" size={isCompactDevice ? 26 : 28} />
              </View>

              <View style={[
                styles.albumArtContainer,
                {
                  marginTop: isLandscape ? 12 : 22,
                  width: isLandscape ? '42%' : '100%',
                  alignSelf: isLandscape ? 'center' : 'stretch',
                }
              ]}>
                <Image source={{ uri: getCoverUrl(currentSong, backendUrl) }} style={styles.mainAlbumArt} />
              </View>

              <View style={[styles.playerMeta, { marginTop: isLandscape ? 14 : 22 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.playerTitle, { fontSize: isLandscape ? 20 : (isCompactDevice ? 24 : 28) }]} numberOfLines={1}>{getSongTitle(currentSong)}</Text>
                  <Text style={[styles.playerArtist, { fontSize: isLandscape ? 13 : (isCompactDevice ? 15 : 18) }]}>{getSongArtist(currentSong)}</Text>
                </View>
                <TouchableOpacity onPress={() => onToggleLike(currentSong)}>
                  <Heart 
                    fill={isLiked ? "#f43f5e" : "transparent"} 
                    color={isLiked ? "#f43f5e" : "#fff"} 
                    size={isLandscape ? 24 : 28} 
                  />
                </TouchableOpacity>
              </View>

              <ProgressBar 
                position={position} 
                duration={duration} 
                onSeek={onSeek} 
              />

              <View style={[styles.mainControls, { marginTop: isLandscape ? 16 : 22 }]}>
                <Repeat color="#fff" size={20} style={{ opacity: 0.6 }} />
                <TouchableOpacity
                  onPress={onPrevious}
                  style={styles.transportBtn}
                >
                  <SkipBack color="#fff" size={isLandscape ? 28 : 32} fill="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.mainPlayBtn, 
                    { 
                      width: isLandscape ? 64 : (isCompactDevice ? 72 : 80), 
                      height: isLandscape ? 64 : (isCompactDevice ? 72 : 80), 
                      borderRadius: isLandscape ? 32 : (isCompactDevice ? 36 : 40) 
                    }
                  ]} 
                  onPress={onTogglePlayPause}
                >
                  <BlurView intensity={30} tint="light" style={styles.playBlur}>
                    {isPlaying ? <Pause color="#fff" size={isLandscape ? 28 : 32} fill="#fff" /> : <Play color="#fff" size={isLandscape ? 28 : 32} fill="#fff" />}
                  </BlurView>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onNext}
                  style={styles.transportBtn}
                >
                  <SkipForward color="#fff" size={isLandscape ? 28 : 32} fill="#fff" />
                </TouchableOpacity>
                <Volume2 color="#fff" size={20} style={{ opacity: 0.6 }} />
              </View>

              {!isLandscape && (
                <TouchableOpacity style={styles.lyricsBtn}>
                  <BlurView intensity={20} tint="light" style={styles.lyricsBlur}>
                    <Text style={styles.lyricsText}>LYRICS</Text>
                  </BlurView>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
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
  nowPlayingText: {
    color: '#fff',
    fontWeight: '600',
  },
  albumArtContainer: {
    aspectRatio: 1,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  mainAlbumArt: {
    width: '100%',
    height: '100%',
  },
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  playerArtist: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transportBtn: {
    padding: 10,
    borderRadius: 999,
  },
  mainPlayBtn: {
    overflow: 'hidden',
  },
  playBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  lyricsBtn: {
    marginTop: 'auto',
    marginBottom: 12,
    height: 56,
    borderRadius: 30,
    overflow: 'hidden',
  },
  lyricsBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  lyricsText: {
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    fontSize: 14,
  },
});
