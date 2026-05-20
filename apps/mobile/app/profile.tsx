import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, colorFromLabel, getInitials } from '@/constants/colors';
import { Storage, KEYS } from '@/lib/storage';
import { IcArrowLeft } from '@/components/Icons';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    Storage.get(KEYS.DISPLAY_NAME).then((n) => { if (n) setName(n); });
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    await Storage.set(KEYS.DISPLAY_NAME, name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const avatarColor = colorFromLabel(name || 'user');
  const initials = getInitials(name || 'User');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IcArrowLeft s={18} c="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor + 'cc' }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Name input */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={[styles.input, focused && styles.inputFocused]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="rgba(255,255,255,0.3)"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void handleSave()}
          />

          <TouchableOpacity
            onPress={() => void handleSave()}
            disabled={!name.trim()}
            style={[styles.saveBtn, saved && styles.saveBtnSuccess, !name.trim() && styles.saveBtnDisabled]}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>
              {saved ? '✓ Saved' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reset peerId */}
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            Alert.alert(
              'Reset Peer ID',
              'This will generate a new anonymous identity. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: async () => {
                    await Storage.remove(KEYS.PEER_ID);
                    Alert.alert('Done', 'A new ID will be generated on your next call.');
                  },
                },
              ],
            );
          }}
        >
          <Text style={styles.resetBtnText}>Reset Anonymous ID</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
  },
  headerTitle: { color: 'white', fontSize: 15, fontWeight: '600' },
  content: { flex: 1, alignItems: 'center', padding: 24, gap: 24, paddingTop: 40 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: 'white' },
  card: {
    width: '100%',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
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
    fontSize: 15,
  },
  inputFocused: { borderColor: 'rgba(59,130,246,0.6)' },
  saveBtn: {
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnSuccess: { backgroundColor: 'rgba(34,197,94,0.7)' },
  saveBtnDisabled: { backgroundColor: 'rgba(59,130,246,0.22)' },
  saveBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  resetBtnText: { color: '#F87171', fontSize: 13, fontWeight: '500' },
});
