import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MediaStream } from 'react-native-webrtc';

const RTCView: any = Platform.OS !== 'web'
  ? require('react-native-webrtc').RTCView
  : ({ style }: any) => React.createElement(View, { style });
const mediaDevices: any = Platform.OS !== 'web'
  ? require('react-native-webrtc').mediaDevices
  : navigator.mediaDevices;
import { C, colorFromLabel, getInitials } from '@/constants/colors';
import { Storage, KEYS, getOrCreatePeerId } from '@/lib/storage';
import { IcMic, IcMicOff, IcVideo, IcVideoOff, IcFlipCamera } from '@/components/Icons';

export default function JoinLobbyScreen() {
  const router = useRouter();
  const { roomId: rawRoomId } = useLocalSearchParams<{ roomId: string }>();
  const roomId = decodeURIComponent(rawRoomId ?? '');
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [frontCamera, setFrontCamera] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const previewRef = useRef<MediaStream | null>(null);

  // Load saved name
  useEffect(() => {
    Storage.get(KEYS.DISPLAY_NAME).then((saved) => {
      if (saved) setName(saved);
    });
  }, []);

  // Camera preview
  useEffect(() => {
    const stopPreview = () => {
      previewRef.current?.getTracks().forEach((t) => t.stop());
      previewRef.current = null;
      setPreviewStream(null);
    };

    if (!camOn) { stopPreview(); return; }

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: frontCamera ? 'user' : 'environment',
      },
      audio: false,
    };

    mediaDevices.getUserMedia(constraints as any)
      .then((stream: unknown) => {
        previewRef.current = stream as unknown as MediaStream;
        setPreviewStream(stream as unknown as MediaStream);
        setCamError(false);
      })
      .catch(() => {
        setCamError(true);
        setCamOn(false);
      });

    return stopPreview;
  }, [camOn, frontCamera]);

  const initials = name.trim()
    ? name.trim().split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const tileColor = colorFromLabel(name || 'user');

  const canJoin = name.trim().length > 0;

  const handleJoin = async () => {
    if (!canJoin) return;

    // Stop preview
    previewRef.current?.getTracks().forEach((t) => t.stop());
    previewRef.current = null;
    setPreviewStream(null);

    // Save preferences
    await Storage.set(KEYS.DISPLAY_NAME, name.trim());
    const peerId = await getOrCreatePeerId();
    await Storage.set(KEYS.MIC_ON, micOn ? '1' : '0');
    await Storage.set(KEYS.CAM_ON, camOn ? '1' : '0');

    setConnecting(true);

    // Small delay for UX — the room screen will handle the actual join
    setTimeout(() => {
      router.navigate({ pathname: '/room/[roomId]', params: { roomId } });
    }, 400);
  };

  if (connecting) {
    return (
      <View style={styles.splashRoot}>
        <View style={[styles.splashAvatar, { backgroundColor: tileColor + 'cc' }]}>
          <Text style={styles.splashInitials}>{initials}</Text>
        </View>
        <Text style={styles.splashAppName}>Link</Text>
        <Text style={styles.splashSub}>Joining room…</Text>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, { opacity: 0.4 + i * 0.2 }]} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Room badge */}
        <View style={styles.roomBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.roomBadgeText}>Room </Text>
          <Text style={styles.roomBadgeId}>{roomId}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Camera preview */}
          <View style={styles.previewLabel}>
            <Text style={styles.previewLabelText}>Looks good?</Text>
            <Text style={styles.previewLabelSub}>Your preview</Text>
          </View>

          <View style={styles.preview}>
            {previewStream && camOn && !camError ? (
              <RTCView
                streamURL={previewStream.toURL()}
                style={[styles.previewVideo, styles.mirrored]}
                objectFit="cover"
              />
            ) : (
              <View style={styles.previewAvatar}>
                {initials !== '?' ? (
                  <View style={[styles.avatarCircle, { backgroundColor: tileColor + 'cc' }]}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <IcVideo s={24} c="rgba(255,255,255,0.2)" />
                  </View>
                )}
                <Text style={styles.camOffLabel}>
                  {camError ? 'Camera unavailable' : 'Camera off'}
                </Text>
              </View>
            )}

            {/* Overlay toggles */}
            <View style={styles.previewControls}>
              <TouchableOpacity
                onPress={() => setMicOn((v) => !v)}
                style={[styles.previewToggle, !micOn && styles.previewToggleOff]}
              >
                {micOn ? <IcMic s={16} c="white" /> : <IcMicOff s={16} c="white" />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCamOn((v) => !v)}
                style={[styles.previewToggle, !camOn && styles.previewToggleOff]}
              >
                {camOn ? <IcVideo s={16} c="white" /> : <IcVideoOff s={16} c="white" />}
              </TouchableOpacity>
              {camOn && (
                <TouchableOpacity
                  onPress={() => setFrontCamera((v) => !v)}
                  style={styles.previewToggle}
                >
                  <IcFlipCamera s={16} c="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Name input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={[styles.input, nameFocused && styles.inputFocused]}
              placeholder="e.g. Alex Chen"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={name}
              onChangeText={setName}
              onSubmitEditing={() => { if (canJoin) void handleJoin(); }}
              returnKeyType="go"
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              autoCorrect={false}
            />
          </View>

          {/* Join button */}
          <TouchableOpacity
            onPress={() => void handleJoin()}
            disabled={!canJoin}
            style={[styles.joinBtn, !canJoin && styles.joinBtnDisabled]}
            activeOpacity={0.8}
          >
            <Text style={[styles.joinBtnText, !canJoin && styles.joinBtnTextDisabled]}>
              Join Room
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          By joining you agree to Link&apos;s Terms of Service
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 20,
    minHeight: '100%',
    justifyContent: 'center',
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  greenDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.green },
  roomBadgeText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  roomBadgeId: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  card: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    gap: 16,
  },
  previewLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabelText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
  previewLabelSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#080a10',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  previewVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  previewAvatar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 26, fontWeight: '700', color: 'white' },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camOffLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  previewControls: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  previewToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewToggleOff: { backgroundColor: 'rgba(239,68,68,0.7)' },
  inputWrapper: { gap: 6 },
  inputLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
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
  joinBtn: {
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  joinBtnDisabled: { backgroundColor: 'rgba(59,130,246,0.22)' },
  joinBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
  joinBtnTextDisabled: { color: 'rgba(255,255,255,0.3)' },
  footer: { color: 'rgba(255,255,255,0.18)', fontSize: 11, textAlign: 'center' },

  // Splash/connecting
  splashRoot: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splashAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  splashInitials: { fontSize: 26, fontWeight: '700', color: 'white' },
  splashAppName: { color: 'white', fontSize: 18, fontWeight: '700' },
  splashSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.blue },
});
