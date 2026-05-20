import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Register WebRTC globals on native only — web has browser WebRTC natively
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-webrtc');
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0a0c14" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0c14' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="join/[roomId]" />
        <Stack.Screen name="room/[roomId]" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="auth/signin" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  );
}
