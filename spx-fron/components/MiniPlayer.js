import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Play, Pause } from 'lucide-react-native';
import { getSongTitle, getCoverUrl } from '../utils/helpers';

export function MiniPlayer({ currentSong, isPlaying, onTogglePlayPause, onPress, backendUrl }) {
  if (!currentSong) return null;

  return (
    <BlurView intensity={80} tint="dark" style={styles.miniPlayer}>
      <View style={styles.miniPlayerContent}>
        <TouchableOpacity 
          style={styles.miniPlayerTouchable}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Image source={{ uri: getCoverUrl(currentSong, backendUrl) }} style={styles.miniThumb} />
          <View style={styles.miniInfo}>
            <Text style={styles.miniTitle} numberOfLines={1}>{getSongTitle(currentSong)}</Text>
            <Text style={styles.miniArtist}>Playing Now</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.playPauseBtn} 
          onPress={onTogglePlayPause}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          {isPlaying ? <Pause color="#fff" size={24} /> : <Play color="#fff" size={24} />}
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  miniPlayer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  miniThumb: {
    width: 45,
    height: 45,
    borderRadius: 10,
  },
  miniInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  miniTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  miniArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  playPauseBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
