import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import { ThemeContext, Surface } from '@/src/lib/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [surface, setSurface] = useState<Surface>('light');

  useEffect(() => {
    // Allow audio to play on iOS even when the mute switch is on.
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ surface, setSurface }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="review/index"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="streak/index" options={{ title: 'Your streak' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
