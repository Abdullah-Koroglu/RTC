import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { C } from '@/constants/colors';

export default function NotFound() {
  const router = useRouter();
  const path = usePathname();

  return (
    <View style={styles.root}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.path}>{path}</Text>
      <TouchableOpacity onPress={() => router.replace('/')} style={styles.btn}>
        <Text style={styles.btnText}>Go home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  code: { color: C.blue, fontSize: 64, fontWeight: '800', letterSpacing: -2 },
  title: { color: 'white', fontSize: 20, fontWeight: '600' },
  path: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  btn: {
    marginTop: 8,
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  btnText: { color: 'white', fontSize: 14, fontWeight: '600' },
});
