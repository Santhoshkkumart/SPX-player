import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Heart, Plus, Trash2 } from 'lucide-react-native';
import { getSongTitle, getSongArtist, getCoverUrl } from '../utils/helpers';

export function SongRow({ song, isLiked, onPlay, onLike, onAddClick, onDelete, backendUrl, rightAction }) {
  return (
    <TouchableOpacity
      style={styles.songRow}
      onPress={() => onPlay(song)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: getCoverUrl(song, backendUrl) }} style={styles.songThumb} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>{getSongTitle(song)}</Text>
        <Text style={styles.songArtist} numberOfLines={1}>{getSongArtist(song)}</Text>
      </View>
      {rightAction ? (
        rightAction
      ) : (
        <View style={styles.actions}>
          {onAddClick && (
            <TouchableOpacity onPress={() => onAddClick(song)} style={styles.iconBtn} hitSlop={8}>
              <Plus color="#94a3b8" size={20} />
            </TouchableOpacity>
          )}
          {onLike && (
            <TouchableOpacity onPress={() => onLike(song)} style={styles.iconBtn} hitSlop={8}>
              <Heart
                fill={isLiked ? '#f43f5e' : 'transparent'}
                color={isLiked ? '#f43f5e' : '#94a3b8'}
                size={20}
              />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(song)} style={styles.iconBtn} hitSlop={8}>
              <Trash2 color="#f87171" size={18} />
            </TouchableOpacity>
          )}
        </View>
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
    backgroundColor: '#1e1e1e',
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
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
  },
});
