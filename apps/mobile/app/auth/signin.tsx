import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { C } from '@/constants/colors';
import { Storage, KEYS } from '@/lib/storage';

const GoogleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </Svg>
);

const GitHubIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
    <Path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </Svg>
);

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const dest = next ?? '/';

  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);

  const handleEmailContinue = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const name = trimmed.includes('@') ? (trimmed.split('@')[0] ?? trimmed) : trimmed;
    await Storage.set(KEYS.DISPLAY_NAME, name);
    router.replace(dest as any);
  };

  const handleAnonymous = () => {
    router.replace(dest as any);
  };

  // Social sign-in not available in the native app without OAuth setup
  const SocialBtn = ({ icon, label, disabled }: { icon: React.ReactNode; label: string; disabled?: boolean }) => (
    <View style={[styles.socialBtn, disabled && styles.socialBtnDisabled]}>
      {icon}
      <Text style={[styles.socialBtnText, disabled && styles.socialBtnTextDisabled]}>{label}</Text>
      {disabled && <Text style={styles.comingSoon}>Soon</Text>}
    </View>
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/logo-only.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Sign in to Link</Text>
          <Text style={styles.subtitle}>Choose how you'd like to continue</Text>
        </View>

        {/* Social buttons */}
        <View style={styles.section}>
          <SocialBtn icon={<GoogleIcon />} label="Continue with Google" disabled />
          <SocialBtn icon={<GitHubIcon />} label="Continue with GitHub" disabled />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email */}
        <View style={styles.section}>
          <TextInput
            style={[styles.input, emailFocused && styles.inputFocused]}
            placeholder="Enter your email"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => void handleEmailContinue()}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />
          <TouchableOpacity
            onPress={() => void handleEmailContinue()}
            style={[styles.emailBtn, !email.trim() && styles.emailBtnDisabled]}
            disabled={!email.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.emailBtnText}>Continue with email</Text>
          </TouchableOpacity>
        </View>

        {/* Anonymous */}
        <TouchableOpacity onPress={handleAnonymous} style={styles.anonBtn} activeOpacity={0.8}>
          <Text style={styles.anonBtnText}>Continue without signing in</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          By continuing you agree to Link's Terms &amp; Privacy Policy
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, justifyContent: 'center' },
  card: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    gap: 0,
  },
  header: { alignItems: 'center', marginBottom: 24, gap: 8 },
  logo: { width: 52, height: 52, marginBottom: 4 },
  title: { color: 'white', fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { color: 'rgba(255,255,255,0.38)', fontSize: 13, textAlign: 'center' },
  section: { gap: 9, marginBottom: 16 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  socialBtnDisabled: { opacity: 0.5 },
  socialBtnText: { color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'center' },
  socialBtnTextDisabled: { color: 'rgba(255,255,255,0.4)' },
  comingSoon: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  dividerText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: 'white',
    fontSize: 14,
  },
  inputFocused: { borderColor: 'rgba(59,130,246,0.6)' },
  emailBtn: {
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  emailBtnDisabled: { backgroundColor: 'rgba(59,130,246,0.22)' },
  emailBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  anonBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  anonBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  legal: { color: 'rgba(255,255,255,0.22)', fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
