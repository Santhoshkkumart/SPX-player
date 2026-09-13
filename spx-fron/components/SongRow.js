import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Heart, Plus } from 'lucide-react-native';
import { getSongTitle, getSongArtist, getCoverUrl } from '../utils/helpers';

export function SongRow({ song, isLiked, onPlay, onLike, onAddClick, backendUrl, rightAction }) {
  return (
    <TouchableOpacity 
      style={styles.songRow}
      onPress={() => onPlay(song)}
    >
      <Image source={{ uri: getCoverUrl(song, backendUrl) }} style={styles.songThumb} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>{getSongTitle(song)}</Text>
        <Text style={styles.songArtist}>{getSongArtist(song)}</Text>
      </View>
      {rightAction ? (
        rightAction
      ) : (
        <>
          <TouchableOpacity 
            onPress={() => onAddClick(song)} 
            style={styles.plusBtn}
          >
            <Plus color="#94a3b8" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onLike(song)} style={styles.heartBtn}>
            <Heart 
              fill={isLiked ? "#f43f5e" : "transparent"} 
              color={isLiked ? "#f43f5e" : "#94a3b8"} 
              size={20} 
            />
          </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  songThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  songInfo: {
    marginLeft: 16,
    flex: 1,
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  songArtist: {
    color: '#94a3b8',
    fontSize: 14,
  },
  plusBtn: {
    padding: 8,
    marginRight: 4,
  },
  heartBtn: {
    padding: 8,
  },
});
