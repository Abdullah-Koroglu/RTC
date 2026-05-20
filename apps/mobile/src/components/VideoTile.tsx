import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import type { MediaStream } from 'react-native-webrtc';

// RTCView is native-only — web uses a <video> element via react-native-web's Video
const RTCView: any = Platform.OS !== 'web'
  ? require('react-native-webrtc').RTCView
  : ({ streamURL: _url, style, objectFit: _fit }: any) =>
      React.createElement(View, { style });
import { C, colorFromLabel, getInitials } from '@/constants/colors';
import { IcMicOff } from './Icons';

export interface VideoTileProps {
  stream: MediaStream;
  label: string;
  muted?: boolean;
  mirrored?: boolean;
  isMicMuted?: boolean;
  cameraEnabled?: boolean;
  photo?: string | null;
}

export const VideoTile = memo(function VideoTile({
  stream,
  label,
  muted = false,
  mirrored = false,
  isMicMuted = false,
  cameraEnabled,
  photo,
}: VideoTileProps) {
  const tileColor = colorFromLabel(label);
  const initials = getInitials(label);
  const hasVideoTracks = stream.getVideoTracks().length > 0 && cameraEnabled !== false;

  return (
    <View style={[styles.container, { borderColor: C.border }]}>
      {/* Avatar background — always rendered, hidden when video is on */}
      <View style={[styles.avatarBg, { backgroundColor: C.tileBg }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatarPhoto} />
        ) : (
          <View style={[styles.avatarInitials, { backgroundColor: tileColor + 'cc' }]}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Video — rendered only when camera is on */}
      {hasVideoTracks && (
        <RTCView
          streamURL={stream.toURL()}
          style={[styles.video, mirrored && styles.mirrored]}
          objectFit="cover"
        />
      )}

      {/* Bottom label row */}
      <View style={styles.labelRow}>
        <View style={styles.labelBadge}>
          <Text style={styles.labelText} numberOfLines={1}>{label}</Text>
        </View>
        {isMicMuted && (
          <View style={styles.mutedBadge}>
            <IcMicOff s={10} c="white" />
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.tileBg,
    borderWidth: 2,
    position: 'relative',
  },
  avatarBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInitials: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    letterSpacing: -0.5,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  labelRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  labelBadge: {
    backgroundColor: 'rgba(0,0,0,0.58)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
    maxWidth: 180,
  },
  labelText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  mutedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(239,68,68,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
