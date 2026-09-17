import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause } from 'lucide-react-native';
import { getSongTitle, getCoverUrl } from '../utils/helpers';

export function MiniPlayer({ currentSong, isPlaying, position, duration, onTogglePlayPause, onPress, onOpenPlayer, backendUrl }) {
  if (!currentSong) return null;

  const handleOpen = onPress || onOpenPlayer;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;

  return (
    <View style={styles.miniPlayerWrapper}>
      <BlurView intensity={85} tint="dark" style={styles.miniPlayerGlass}>
        {/* Subtle Top Progress Line */}
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={['#8B5CF6', '#38BDF8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>

        <View style={styles.miniPlayerContent}>
          <TouchableOpacity 
            style={styles.miniPlayerTouchable}
            onPress={handleOpen}
            activeOpacity={0.82}
          >
            <View style={styles.thumbWrapper}>
              <Image source={{ uri: getCoverUrl(currentSong, backendUrl) }} style={styles.miniThumb} />
            </View>
            
            <View style={styles.miniInfo}>
              <Text style={styles.miniTitle} numberOfLines={1}>{getSongTitle(currentSong)}</Text>
              <View style={styles.subInfoRow}>
                <View style={[styles.pulseDot, isPlaying && styles.pulseDotActive]} />
                <Text style={styles.miniArtist} numberOfLines={1}>
                  {isPlaying ? 'Now Playing' : 'Paused'} • Tap to expand
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Violet Gradient Play/Pause Button */}
          <TouchableOpacity 
            onPress={onTogglePlayPause}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              style={styles.playOrbBtn}
            >
              {isPlaying ? (
                <Pause color="#ffffff" size={18} fill="#ffffff" />
              ) : (
                <Play color="#ffffff" size={18} fill="#ffffff" style={{ marginLeft: 2 }} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  miniPlayerWrapper: {
    position: 'absolute',
    bottom: 72,
    left: 14,
    right: 14,
    zIndex: 90,
  },
  miniPlayerGlass: {
    height: 66,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(15, 17, 26, 0.88)',
    elevation: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  miniPlayerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  miniPlayerTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbWrapper: {
    position: 'relative',
  },
  miniThumb: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  miniInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  miniTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748B',
    marginRight: 6,
  },
  pulseDotActive: {
    backgroundColor: '#A78BFA',
  },
  miniArtist: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '600',
  },
  playOrbBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
});

