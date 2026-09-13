import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import { getSongTitle, getSongArtist, getCoverUrl } from '../utils/helpers';

export function PlaylistCard({ song, onPlay, backendUrl }) {
  return (
    <TouchableOpacity 
      style={styles.playlistCard}
      onPress={() => onPlay(song)}
    >
      <Image source={{ uri: getCoverUrl(song, backendUrl) }} style={styles.playlistImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.playlistGradient}
      >
        <View style={styles.playlistInfo}>
          <View style={styles.textContainer}>
            <Text style={styles.playlistTitle} numberOfLines={1}>{getSongTitle(song)}</Text>
            <Text style={styles.playlistArtist}>{getSongArtist(song)}</Text>
          </View>
          <View style={styles.playCircle}>
            <Play fill="#fff" color="#fff" size={16} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  playlistCard: {
    width: 240,
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 20,
  },
  playlistImage: {
    width: '100%',
    height: '100%',
  },
  playlistGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  playlistInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  playlistTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playlistArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
