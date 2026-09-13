import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';

const QUICK_ADDRESSES = [
  { label: 'Android Emulator', url: 'http://10.0.2.2:3000' },
  { label: 'Localhost', url: 'http://localhost:3000' },
];

export function SettingsModal({ tempUrl, onUrlChange, onTest, onCancel, onSave, defaultUrl, currentUser, onLogout }) {
  return (
    <View style={styles.overlay}>
      <BlurView intensity={80} tint="dark" style={styles.modal}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Server Settings</Text>

          {currentUser && (
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userLabel}>Signed in as</Text>
                <Text style={styles.userName} numberOfLines={1}>
                  {currentUser.username}
                  {currentUser.role === 'admin' ? ' (Admin)' : ''}
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

          <View style={styles.setupGuide}>
            <Text style={styles.setupTitle}>How to connect:</Text>
            <Text style={styles.setupStep}>1. Start the backend: <Text style={styles.code}>cd spx-bend && npm start</Text></Text>
            <Text style={styles.setupStep}>2. Note the Network IP shown in the terminal</Text>
            <Text style={styles.setupStep}>3. Enter it below as <Text style={styles.code}>http://192.168.x.x:3000</Text></Text>
            <Text style={styles.setupStep}>4. Both devices must be on the same Wi-Fi</Text>
          </View>

          <Text style={styles.label}>Backend URL:</Text>
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

          <Text style={styles.quickLabel}>Quick fill:</Text>
          <View style={styles.quickRow}>
            {QUICK_ADDRESSES.map((item) => (
              <TouchableOpacity
                key={item.url}
                style={styles.quickBtn}
                onPress={() => onUrlChange(item.url)}
              >
                <Text style={styles.quickBtnText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.testButton} onPress={onTest}>
              <Text style={styles.buttonText}>Test</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={onSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BlurView>
    </View>
  );
}

export function CreatePlaylistModal({ name, onNameChange, onCancel, onCreate }) {
  return (
    <View style={styles.overlay}>
      <BlurView intensity={80} tint="dark" style={styles.modal}>
        <Text style={styles.title}>Create Playlist</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onNameChange}
          placeholder="Playlist Name"
          placeholderTextColor="#666"
          autoFocus
        />
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={onCreate}>
            <Text style={styles.buttonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

export function AddToPlaylistModal({ playlists, onSelect, onClose }) {
  return (
    <View style={styles.overlay}>
      <BlurView intensity={80} tint="dark" style={styles.modal}>
        <Text style={styles.title}>Add to Playlist</Text>
        <ScrollView style={{ maxHeight: 300 }}>
          {playlists.length > 0 ? (
            playlists.map((playlist, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.selectItem}
                onPress={() => onSelect(playlist.id)}
              >
                <Text style={styles.selectText}>{playlist.name}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No playlists created yet.</Text>
          )}
        </ScrollView>
        <TouchableOpacity 
          style={[styles.cancelButton, { marginTop: 20 }]} 
          onPress={onClose}
        >
          <Text style={styles.cancelText}>Close</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '88%',
    maxHeight: '85%',
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    fontSize: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 18,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#444',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#6366f1',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelText: {
    color: '#aaa',
    fontWeight: '600',
  },
  selectItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  selectText: {
    color: '#fff',
    fontSize: 16,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  setupGuide: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
  },
  setupTitle: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  setupStep: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 20,
  },
  code: {
    color: '#e2e8f0',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  quickLabel: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  quickBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(99,102,241,0.10)',
    borderRadius: 12,
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
    color: '#6366f1',
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
