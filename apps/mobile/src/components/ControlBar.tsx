import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { C } from '@/constants/colors';
import { IcMic, IcMicOff, IcVideo, IcVideoOff, IcChat, IcPhone, IcGrid } from './Icons';

interface CtrlBtnProps {
  onPress: () => void;
  icon: React.ReactNode;
  label?: string;
  danger?: boolean;
  forceRed?: boolean;
  lit?: boolean;
  badge?: number;
}

function CtrlBtn({ onPress, icon, label, danger, forceRed, lit, badge }: CtrlBtnProps) {
  const [pressed, setPressed] = useState(false);

  const bg = forceRed
    ? pressed ? '#DC2626' : '#EF4444'
    : danger
    ? 'rgba(239,68,68,0.13)'
    : lit
    ? 'rgba(59,130,246,0.18)'
    : pressed
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(255,255,255,0.07)';

  const iconColor = forceRed
    ? 'white'
    : danger
    ? '#F87171'
    : lit
    ? '#3B82F6'
    : 'rgba(255,255,255,0.82)';

  const borderColor = lit ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)';

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      activeOpacity={1}
      style={[
        styles.btn,
        label ? styles.btnWithLabel : styles.btnCircle,
        { backgroundColor: bg, borderColor },
      ]}
    >
      {icon}
      {label ? <Text style={[styles.btnLabel, { color: iconColor }]}>{label}</Text> : null}
      {badge !== undefined && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

interface ControlBarProps {
  micOn: boolean;
  camOn: boolean;
  chatOpen: boolean;
  breakoutOpen: boolean;
  unread: number;
  onMic: () => void;
  onCam: () => void;
  onChat: () => void;
  onBreakout: () => void;
  onLeave: () => void;
}

export function ControlBar({
  micOn,
  camOn,
  chatOpen,
  breakoutOpen,
  unread,
  onMic,
  onCam,
  onChat,
  onBreakout,
  onLeave,
}: ControlBarProps) {
  return (
    <View style={styles.bar}>
      <CtrlBtn
        onPress={onMic}
        icon={micOn ? <IcMic s={22} c="rgba(255,255,255,0.82)" /> : <IcMicOff s={22} c="#F87171" />}
        danger={!micOn}
      />
      <CtrlBtn
        onPress={onCam}
        icon={camOn ? <IcVideo s={22} c="rgba(255,255,255,0.82)" /> : <IcVideoOff s={22} c="#F87171" />}
        danger={!camOn}
      />
      <CtrlBtn
        onPress={onChat}
        icon={<IcChat s={22} c={chatOpen ? '#3B82F6' : 'rgba(255,255,255,0.82)'} />}
        lit={chatOpen}
        badge={unread}
      />
      <CtrlBtn
        onPress={onBreakout}
        icon={<IcGrid s={22} c={breakoutOpen ? '#3B82F6' : 'rgba(255,255,255,0.82)'} />}
        lit={breakoutOpen}
      />
      <View style={styles.divider} />
      <CtrlBtn
        onPress={onLeave}
        icon={<IcPhone s={22} c="white" />}
        forceRed
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(10,12,18,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
  },
  btn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  btnCircle: {},
  btnWithLabel: {
    borderRadius: 12,
    paddingHorizontal: 16,
    width: 'auto',
    flexDirection: 'column',
    gap: 4,
  },
  btnLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 4,
  },
});
