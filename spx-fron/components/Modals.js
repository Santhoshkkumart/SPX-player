import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Plus } from 'lucide-react-native';
import { getSongTitle } from '../utils/helpers';

export function SettingsModal({
  visible,
  tempUrl,
  onUrlChange,
  onTest,
  onCancel,
  onSave,
  currentUser,
  onLogout,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <BlurView intensity={80} tint="dark" style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn} hitSlop={12}>
              <X color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>

          {currentUser && (
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userLabel}>Signed in as</Text>
                <Text style={styles.userName} numberOfLines={1}>
                  {currentUser.username}
                  {currentUser.role === 'admin' ? ' · Admin' : ''}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>{currentUser.email}</Text>
              </View>
              {onLogout && (
                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                  <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.label}>Backend URL</Text>
          <TextInput
            style={styles.input}
            value={tempUrl}
            onChangeText={onUrlChange}
            placeholder="http://192.168.1.x:3000"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <View style={styles.buttonColumn}>
            <TouchableOpacity style={styles.saveButton} onPress={onSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={onTest}>
                <Text style={styles.buttonText}>Test</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function CreatePlaylistModal({ visible, name, onNameChange, onCancel, onCreate }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <BlurView intensity={80} tint="dark" style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Create Playlist</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn} hitSlop={12}>
              <X color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Playlist name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={onNameChange}
            placeholder="Late night mix"
            placeholderTextColor="#666"
            autoFocus
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={onCreate}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={onCreate}>
              <Text style={styles.buttonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function AddToPlaylistModal({ visible, playlists, onSelect, onClose, onCreatePlaylist }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <BlurView intensity={80} tint="dark" style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Add to Playlist</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <X color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {playlists.length > 0 ? (
              playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.selectItem}
                  onPress={() => onSelect(playlist.id)}
                >
                  <Text style={styles.selectText}>{playlist.name}</Text>
                  <Text style={styles.selectHint}>
                    {(playlist.songs || []).length} {(playlist.songs || []).length === 1 ? 'song' : 'songs'}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No playlists yet. Create one to add this song.</Text>
            )}
          </ScrollView>
          {onCreatePlaylist && (
            <TouchableOpacity style={styles.saveButton} onPress={onCreatePlaylist}>
              <Plus color="#fff" size={16} />
              <Text style={styles.buttonText}>New playlist</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.secondaryButton, { marginTop: 10 }]} onPress={onClose}>
            <Text style={styles.cancelText}>Close</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
}

export function AddSongsToPlaylistModal({ visible, songs, onAdd, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <BlurView intensity={80} tint="dark" style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Add Songs</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <X color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {songs.length > 0 ? (
              songs.map((song) => (
                <TouchableOpacity
                  key={song.id || song.filename}
                  style={styles.selectItem}
                  onPress={() => onAdd(song)}
                >
                  <Text style={styles.selectText} numberOfLines={1}>{getSongTitle(song)}</Text>
                  <Plus color="#38bdf8" size={18} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>Every song is already in this playlist.</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.cancelText}>Done</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '78%',
    backgroundColor: '#1a1a1f',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#2a2a32',
    color: '#fff',
    fontSize: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3f3f46',
    marginBottom: 18,
  },
  buttonColumn: {
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#2a2a32',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 15,
  },
  list: {
    maxHeight: 320,
    marginBottom: 14,
  },
  selectItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  selectHint: {
    color: '#64748b',
    fontSize: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 18,
    lineHeight: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(99,102,241,0.10)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
    gap: 10,
  },
  userInfo: {
    flex: 1,
  },
  userLabel: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(244,63,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
  },
  logoutText: {
    color: '#f43f5e',
    fontSize: 13,
    fontWeight: '700',
  },
});
