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
import { LinearGradient } from 'expo-linear-gradient';
import { X, Plus, Server, Check, Activity, User } from 'lucide-react-native';
import { getSongTitle } from '../utils/helpers';

export function SettingsModal({
  visible,
  tempUrl,
  backendUrl,
  onUrlChange,
  onChangeUrl,
  onTest,
  onTestConnection,
  onCancel,
  onClose,
  onSave,
  currentUser,
  onLogout,
}) {
  const urlValue = tempUrl !== undefined ? tempUrl : (backendUrl || '');
  const handleUrlChange = onUrlChange || onChangeUrl;
  const handleCancel = onCancel || onClose;
  const handleTest = onTest || onTestConnection;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        
        {/* Luxury Obsidian Glass Container */}
        <BlurView intensity={95} tint="dark" style={styles.clayModalContainer}>
          <LinearGradient
            colors={['rgba(21, 24, 40, 0.98)', 'rgba(11, 13, 20, 0.99)']}
            style={styles.modalGradientInner}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.iconContainer}>
                    <Server color="#A78BFA" size={20} />
                  </View>
                  <View>
                    <Text style={styles.headerCategory}>SYSTEM SETUP</Text>
                    <Text style={styles.title}>Server Node Settings</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleCancel} style={styles.closeBtn} hitSlop={12}>
                  <X color="#94A3B8" size={18} />
                </TouchableOpacity>
              </View>

              {/* Status Badge */}
              <View style={styles.statusBadge}>
                <View style={styles.statusDotPulse} />
                <Text style={styles.statusBadgeText}>SPX High-Performance Engine • Port 3000</Text>
              </View>

              {/* User Profile Card */}
              {currentUser && (
                <View style={styles.userCardGlass}>
                  <View style={styles.avatarPill}>
                    <User color="#A78BFA" size={20} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userLabel}>ACTIVE USER</Text>
                    <Text style={styles.userName} numberOfLines={1}>
                      {currentUser.username}
                      {currentUser.role === 'admin' ? ' · Admin' : ''}
                    </Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{currentUser.email}</Text>
                  </View>
                  {onLogout && (
                    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
                      <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Server URL Input Box */}
              <Text style={styles.label}>LAN BACKEND URL</Text>
              <View style={styles.inputBox}>
                <Server color="#A78BFA" size={18} style={{ marginLeft: 14, marginRight: 10 }} />
                <TextInput
                  style={styles.inputField}
                  value={urlValue}
                  onChangeText={handleUrlChange}
                  placeholder="http://192.168.31.84:3000"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
              <Text style={styles.inputHint}>Enter your computer's local IP address on WiFi</Text>

              {/* Action Buttons */}
              <View style={styles.buttonColumn}>
                <TouchableOpacity onPress={onSave} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    style={styles.saveButtonGradient}
                  >
                    <Check color="#FFFFFF" size={20} style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Save & Connect</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.buttonRow}>
                  {handleTest && (
                    <TouchableOpacity style={styles.glassBtn} onPress={handleTest} activeOpacity={0.85}>
                      <Activity color="#A78BFA" size={16} style={{ marginRight: 6 }} />
                      <Text style={styles.glassBtnText}>Test Signal</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.slateBtn} onPress={handleCancel} activeOpacity={0.85}>
                    <Text style={styles.slateBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function CreatePlaylistModal({ visible, name, playlistName, onNameChange, onChangeName, onCancel, onClose, onCreate }) {
  const nameValue = name !== undefined ? name : (playlistName || '');
  const handleNameChange = onNameChange || onChangeName;
  const handleCancel = onCancel || onClose;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        <BlurView intensity={95} tint="dark" style={styles.clayModalContainer}>
          <LinearGradient
            colors={['rgba(21, 24, 40, 0.98)', 'rgba(11, 13, 20, 0.99)']}
            style={styles.modalGradientInner}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.headerCategory}>COLLECTION</Text>
                <Text style={styles.title}>Create Playlist</Text>
              </View>
              <TouchableOpacity onPress={handleCancel} style={styles.closeBtn} hitSlop={12}>
                <X color="#94A3B8" size={18} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>PLAYLIST TITLE</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputField}
                value={nameValue}
                onChangeText={handleNameChange}
                placeholder="Late Night Synthwave"
                placeholderTextColor="#64748B"
                autoFocus
                maxLength={80}
                returnKeyType="done"
                onSubmitEditing={onCreate}
              />
            </View>
            <View style={[styles.buttonRow, { marginTop: 18 }]}>
              <TouchableOpacity style={styles.slateBtn} onPress={handleCancel} activeOpacity={0.85}>
                <Text style={styles.slateBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1 }} onPress={onCreate} activeOpacity={0.85}>
                <LinearGradient colors={['#8B5CF6', '#6366F1']} style={[styles.saveButtonGradient, { minHeight: 48 }]}>
                  <Text style={styles.saveButtonText}>Create</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function AddToPlaylistModal({ visible, playlists = [], song, onSelect, onSelectPlaylist, onClose, onCancel, onCreatePlaylist, onCreateNew }) {
  const handleSelect = onSelect || onSelectPlaylist;
  const handleClose = onClose || onCancel;
  const handleCreate = onCreatePlaylist || onCreateNew;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <BlurView intensity={95} tint="dark" style={styles.clayModalContainer}>
          <LinearGradient
            colors={['rgba(21, 24, 40, 0.98)', 'rgba(11, 13, 20, 0.99)']}
            style={styles.modalGradientInner}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.title}>Add to Playlist</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
                <X color="#94A3B8" size={18} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {playlists.length > 0 ? (
                playlists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.selectItemGlass}
                    onPress={() => handleSelect && handleSelect(playlist.id)}
                  >
                    <Text style={styles.selectText}>{playlist.name}</Text>
                    <Text style={styles.selectHint}>
                      {(playlist.songs || []).length} {(playlist.songs || []).length === 1 ? 'song' : 'songs'}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>No playlists yet. Create one to add this track.</Text>
              )}
            </ScrollView>
            {handleCreate && (
              <TouchableOpacity onPress={handleCreate} activeOpacity={0.85}>
                <LinearGradient colors={['#8B5CF6', '#6366F1']} style={[styles.saveButtonGradient, { minHeight: 48 }]}>
                  <Plus color="#FFFFFF" size={18} style={{ marginRight: 6 }} />
                  <Text style={styles.saveButtonText}>New Playlist</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.slateBtn, { marginTop: 10 }]} onPress={handleClose} activeOpacity={0.85}>
              <Text style={styles.slateBtnText}>Close</Text>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>
      </View>
    </Modal>
  );
}

export function AddSongsToPlaylistModal({ visible, songs = [], onAdd, onClose, onCancel }) {
  const handleClose = onClose || onCancel;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <BlurView intensity={95} tint="dark" style={styles.clayModalContainer}>
          <LinearGradient
            colors={['rgba(21, 24, 40, 0.98)', 'rgba(11, 13, 20, 0.99)']}
            style={styles.modalGradientInner}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.title}>Add Tracks</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
                <X color="#94A3B8" size={18} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {songs.length > 0 ? (
                songs.map((song) => (
                  <TouchableOpacity
                    key={song.id || song.filename}
                    style={styles.selectItemGlass}
                    onPress={() => onAdd && onAdd(song)}
                  >
                    <Text style={styles.selectText} numberOfLines={1}>{getSongTitle(song)}</Text>
                    <Plus color="#A78BFA" size={18} />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>Every track is already in this playlist.</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.slateBtn} onPress={handleClose} activeOpacity={0.85}>
              <Text style={styles.slateBtnText}>Done</Text>
            </TouchableOpacity>
          </LinearGradient>
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
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 9, 14, 0.82)',
  },
  clayModalContainer: {
    width: '94%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    elevation: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
  },
  modalGradientInner: {
    padding: 20,
    flexShrink: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerCategory: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  statusDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A78BFA',
    marginRight: 10,
  },
  statusBadgeText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '700',
  },
  userCardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarPill: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  userLabel: {
    color: '#94A3B8',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    color: '#CBD5E1',
    fontSize: 11,
    marginBottom: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 13, 20, 0.95)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    overflow: 'hidden',
  },
  inputField: {
    flex: 1,
    paddingRight: 14,
    paddingVertical: 13,
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputHint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 6,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  buttonColumn: {
    gap: 10,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButtonGradient: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  glassBtn: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  glassBtnText: {
    color: '#A78BFA',
    fontWeight: '800',
    fontSize: 14,
  },
  slateBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  slateBtnText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 14,
  },
  list: {
    maxHeight: 240,
    marginBottom: 16,
  },
  selectItemGlass: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  selectHint: {
    color: '#94A3B8',
    fontSize: 12,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});


