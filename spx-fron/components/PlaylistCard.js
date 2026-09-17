import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Play } from 'lucide-react-native';
import { getSongTitle, getSongArtist, getCoverUrl } from '../utils/helpers';

export function PlaylistCard({ song, onPlay, backendUrl }) {
  return (
    <TouchableOpacity 
      style={styles.cardContainer}
      onPress={() => onPlay(song)}
      activeOpacity={0.88}
    >
      <Image source={{ uri: getCoverUrl(song, backendUrl) }} style={styles.cardCoverImage} />
      
      <LinearGradient
        colors={['transparent', 'rgba(7, 9, 14, 0.3)', 'rgba(7, 9, 14, 0.95)']}
        style={styles.gradientOverlay}
      >
        <BlurView intensity={40} tint="dark" style={styles.frostedGlassBadge}>
          <View style={styles.badgeContent}>
            <View style={styles.metaColumn}>
              <Text style={styles.badgeCategory}>NOW TRENDING</Text>
              <Text style={styles.songTitle} numberOfLines={1}>{getSongTitle(song)}</Text>
              <Text style={styles.songArtist} numberOfLines={1}>{getSongArtist(song)}</Text>
            </View>
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              style={styles.playOrbBtn}
            >
              <Play fill="#ffffff" color="#ffffff" size={14} style={{ marginLeft: 2 }} />
            </LinearGradient>
          </View>
        </BlurView>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: 210,
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#0F111A',
    elevation: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  cardCoverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    justifyContent: 'flex-end',
    padding: 10,
  },
  frostedGlassBadge: {
    borderRadius: 18,
    padding: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(15, 17, 26, 0.65)',
  },
  badgeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaColumn: {
    flex: 1,
    marginRight: 8,
  },
  badgeCategory: {
    color: '#A78BFA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  songArtist: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  playOrbBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});

