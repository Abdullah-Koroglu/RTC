import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { C } from '@/constants/colors';
import { IcGrid, IcX, IcArrowLeft, IcPlus } from './Icons';
import { Storage, KEYS } from '@/lib/storage';

const SCREEN_W = Dimensions.get('window').width;
const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];

function getMainRoomId(roomId: string): string {
  const idx = roomId.indexOf('--br-');
  return idx >= 0 ? roomId.slice(0, idx) : roomId;
}

interface BreakoutPanelProps {
  open: boolean;
  onClose: () => void;
  currentRoomId: string;
  onJoin: (roomId: string) => void;
}

export function BreakoutPanel({ open, onClose, currentRoomId, onJoin }: BreakoutPanelProps) {
  const mainRoomId = getMainRoomId(currentRoomId);
  const isInBreakout = currentRoomId !== mainRoomId;
  const [breakouts, setBreakouts] = useState<string[]>([]);
  const slideAnim = useRef(new Animated.Value(SCREEN_W)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: open ? 0 : SCREEN_W,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [open, slideAnim]);

  useEffect(() => {
    Storage.get(KEYS.BREAKOUTS(mainRoomId)).then((val) => {
      if (val) {
        try { setBreakouts(JSON.parse(val) as string[]); } catch { /* ignore */ }
      }
    });
  }, [mainRoomId]);

  const createBreakout = async () => {
    const n = breakouts.length + 1;
    const newId = `${mainRoomId}--br-${n}`;
    const updated = [...breakouts, newId];
    setBreakouts(updated);
    await Storage.set(KEYS.BREAKOUTS(mainRoomId), JSON.stringify(updated));
  };

  return (
    <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IcGrid s={16} c={C.blue} />
          <Text style={styles.headerTitle}>Breakout Rooms</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <IcX s={14} c="rgba(255,255,255,0.55)" />
        </TouchableOpacity>
      </View>

      {/* Return to main */}
      {isInBreakout && (
        <TouchableOpacity onPress={() => onJoin(mainRoomId)} style={styles.returnBtn}>
          <IcArrowLeft s={14} c={C.blue} />
          <Text style={styles.returnText}>Return to main room</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {/* Main room row */}
        <Text style={styles.sectionLabel}>Main Room</Text>
        <View style={[styles.roomRow, currentRoomId === mainRoomId && styles.roomRowActive]}>
          <View style={styles.roomRowLeft}>
            <View style={[styles.dot, { backgroundColor: currentRoomId === mainRoomId ? C.green : 'rgba(255,255,255,0.2)' }]} />
            <Text style={styles.roomName}>Main Room</Text>
          </View>
          {currentRoomId !== mainRoomId && (
            <TouchableOpacity onPress={() => onJoin(mainRoomId)} style={styles.joinBtn}>
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Breakout list */}
        {breakouts.length > 0 && (
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Breakout Rooms</Text>
        )}
        {breakouts.map((bId, idx) => {
          const isCurrent = currentRoomId === bId;
          const color = COLORS[idx % COLORS.length]!;
          return (
            <View key={bId} style={[styles.roomRow, isCurrent && { borderColor: color + '40', backgroundColor: color + '18' }]}>
              <View style={styles.roomRowLeft}>
                <View style={[styles.roomNumber, { backgroundColor: color + '22', borderColor: color + '40' }]}>
                  <Text style={[styles.roomNumberText, { color }]}>{idx + 1}</Text>
                </View>
                <View>
                  <Text style={styles.roomName}>Breakout {idx + 1}</Text>
                  {isCurrent && <Text style={styles.youAreHere}>You are here</Text>}
                </View>
              </View>
              {!isCurrent && (
                <TouchableOpacity onPress={() => onJoin(bId)} style={[styles.joinBtn, { backgroundColor: color }]}>
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Create breakout */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => void createBreakout()} style={styles.createBtn}>
          <IcPlus s={14} c="rgba(255,255,255,0.7)" />
          <Text style={styles.createBtnText}>Create breakout room</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(11,13,20,0.97)',
    zIndex: 200,
    flexDirection: 'column',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  returnBtn: {
    margin: 12,
    marginBottom: 0,
    padding: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  returnText: {
    color: C.blue,
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 14,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  roomRowActive: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderColor: 'rgba(59,130,246,0.3)',
  },
  roomRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roomNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roomName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  youAreHere: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    marginTop: 1,
  },
  joinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: C.blue,
    borderRadius: 7,
  },
  joinBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  createBtn: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  createBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
});
