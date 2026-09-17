import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Heart, Plus, Trash2, Volume2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSongTitle, getSongArtist, getCoverUrl } from '../utils/helpers';

export function SongRow({
  song,
  index,
  isPlaying,
  isLiked,
  onPlay,
  onPress,
  onLike,
  onToggleLike,
  onAddClick,
  onOpenOptions,
  onDelete,
  backendUrl,
  rightAction,
}) {
  const handlePlay = onPlay || onPress;
  const handleLike = onLike || onToggleLike;
  const handleAdd = onAddClick || onOpenOptions;

  return (
    <TouchableOpacity
      style={[styles.songRow, isPlaying && styles.playingRow]}
      onPress={() => handlePlay && handlePlay(song)}
      activeOpacity={0.82}
    >
      {/* Track Index or Playing Wave Badge */}
      <View style={styles.indexContainer}>
        {isPlaying ? (
          <View style={styles.playingWaveBadge}>
            <Volume2 color="#A78BFA" size={16} />
          </View>
        ) : (
          <Text style={styles.indexText}>{index !== undefined ? String(index + 1).padStart(2, '0') : '•'}</Text>
        )}
      </View>

      {/* Album Artwork Thumbnail */}
      <View style={styles.thumbWrapper}>
        <Image source={{ uri: getCoverUrl(song, backendUrl) }} style={styles.songThumb} />
      </View>

      {/* Track Metadata Info */}
      <View style={styles.songInfo}>
        <Text style={[styles.songTitle, isPlaying && styles.playingTitle]} numberOfLines={1}>
          {getSongTitle(song)}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>{getSongArtist(song)}</Text>
      </View>

      {/* Action Buttons */}
      {rightAction ? (
        rightAction
      ) : (
        <View style={styles.actions}>
          {handleAdd && (
            <TouchableOpacity onPress={() => handleAdd(song)} style={styles.iconBtn} hitSlop={8}>
              <Plus color="#94A3B8" size={17} />
            </TouchableOpacity>
          )}
          {handleLike && (
            <TouchableOpacity onPress={() => handleLike(song)} style={styles.iconBtn} hitSlop={8}>
              <Heart
                fill={isLiked ? '#F43F5E' : 'transparent'}
                color={isLiked ? '#F43F5E' : '#94A3B8'}
                size={17}
              />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(song)} style={styles.iconBtn} hitSlop={8}>
              <Trash2 color="#F87171" size={16} />
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
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 17, 26, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  playingRow: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    elevation: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  indexContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  indexText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  playingWaveBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbWrapper: {
    marginRight: 12,
  },
  songThumb: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  songInfo: {
    flex: 1,
    marginRight: 8,
  },
  songTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  playingTitle: {
    color: '#A78BFA',
    fontWeight: '800',
  },
  songArtist: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});

