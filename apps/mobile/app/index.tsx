import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/colors';
import { generateUUID } from '@/lib/uuid';

function extractRoomId(input: string): string {
  const trimmed = input.trim();
  try {
    // Handle full URLs like https://example.com/join/my-room or /room/my-room
    const url = trimmed.startsWith('http') ? new URL(trimmed) : new URL(`http://x${trimmed}`);
    const parts = url.pathname.split('/').filter(Boolean);
    // /join/[roomId] or /room/[roomId]
    if ((parts[0] === 'join' || parts[0] === 'room') && parts[1]) {
      return decodeURIComponent(parts[1]);
    }
    // If only one segment, use it as room ID
    if (parts.length === 1 && parts[0]) return decodeURIComponent(parts[0]);
  } catch {
    // Not a URL — use as-is
  }
  return trimmed;
}

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showCode, setShowCode] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const goToJoin = (roomId: string) => {
    router.navigate({
      pathname: '/join/[roomId]',
      params: { roomId },
    });
  };

  const startMeeting = () => goToJoin(generateUUID());

  const joinWithCode = () => {
    const id = extractRoomId(roomCode);
    if (!id) { inputRef.current?.focus(); return; }
    goToJoin(id);
  };

  const handleCodeToggle = () => {
    setShowCode((v) => {
      if (!v) setTimeout(() => inputRef.current?.focus(), 100);
      return !v;
    });
    setRoomCode('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top nav */}
        <View style={styles.nav}>
          <View style={styles.navBrand}>
            <Image
              source={require('../assets/logo-only.png')}
              style={styles.navLogo}
              resizeMode="contain"
            />
            <Text style={styles.navTitle}>Link</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.navBtn}>
            <Text style={styles.navBtnText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLogoWrap}>
            <Image
              source={require('../assets/logo-only.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.heroTitle}>Link</Text>
          <Text style={styles.heroSub}>Crystal clear conversations.</Text>
        </View>

        {/* CTAs */}
        <View style={styles.ctaGroup}>
          <TouchableOpacity onPress={startMeeting} style={styles.primaryBtn} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Start a meeting</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCodeToggle} style={styles.secondaryBtn} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>
              {showCode ? 'Cancel' : 'Join with code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline code input */}
        {showCode && (
          <View style={styles.codeRow}>
            <TextInput
              ref={inputRef}
              style={[styles.codeInput, focused && styles.codeInputFocused]}
              placeholder="Room code or meeting link…"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={roomCode}
              onChangeText={setRoomCode}
              onSubmitEditing={joinWithCode}
              returnKeyType="go"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <TouchableOpacity onPress={joinWithCode} style={styles.joinBtn} activeOpacity={0.85}>
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footer}>Trusted by 50,000+ teams worldwide</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 0,
  },
  nav: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLogo: { width: 28, height: 28 },
  navTitle: { color: 'white', fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  navBtnText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  hero: { alignItems: 'center', marginBottom: 40 },
  heroLogoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(59,130,246,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroLogo: { width: 72, height: 72 },
  heroTitle: {
    color: 'white',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 56,
    marginBottom: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  ctaGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: C.blue,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  secondaryBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  codeRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  codeInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: 'white',
    fontSize: 14,
  },
  codeInputFocused: { borderColor: 'rgba(59,130,246,0.6)' },
  joinBtn: {
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  joinBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  footer: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    marginTop: 44,
    textAlign: 'center',
  },
});
