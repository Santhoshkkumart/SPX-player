import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Disc, Server } from 'lucide-react-native';

export function AuthScreen({ mode, error, loading, backendUrl, onServerUrlChange, onModeChange, onLogin, onRegister }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isRegister = mode === 'register';

  const submit = () => {
    if (isRegister) {
      onRegister({ username, email, password });
      return;
    }
    onLogin({ email, password });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <BlurView intensity={90} tint="dark" style={styles.obsidianPanel}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.brandRow}>
              <View style={styles.brandIconWrapper}>
                <Disc color="#A78BFA" size={30} />
              </View>
              <Text style={styles.title}>SPX PLAYER</Text>
            </View>

            <Text style={styles.subtitle}>{isRegister ? 'Create your account to stream' : 'Sign in to your LAN music server'}</Text>

            <Text style={styles.label}>SERVER URL (LAN IP)</Text>
            <View style={styles.serverWrapper}>
              <Server color="#A78BFA" size={18} style={{ marginLeft: 14, marginRight: 8 }} />
              <TextInput
                style={styles.serverInput}
                value={backendUrl}
                onChangeText={onServerUrlChange}
                placeholder="http://192.168.31.84:3000"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {isRegister && (
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#64748B"
                secureTextEntry
              />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                style={styles.primaryButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>{isRegister ? 'Create Account' : 'Sign In'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchButton} onPress={() => onModeChange(isRegister ? 'login' : 'register')}>
              <Text style={styles.switchText}>{isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </BlurView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07090E',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  obsidianPanel: {
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 17, 26, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    elevation: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 12,
  },
  brandIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  serverWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 13, 20, 0.9)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    marginBottom: 16,
  },
  serverInput: {
    flex: 1,
    paddingRight: 14,
    paddingVertical: 12,
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 14,
  },
  input: {
    color: '#F8FAFC',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  error: {
    color: '#F87171',
    textAlign: 'center',
    marginBottom: 14,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButtonGradient: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  switchButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
});

