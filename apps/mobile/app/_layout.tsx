import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeContext, Surface } from '@/src/lib/theme';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [surface, setSurface] = useState<Surface>('light');

  const [fontsLoaded] = useFonts({
    Geist: Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono: GeistMono_400Regular,
    GeistMono_500Medium,
    InstrumentSerif: InstrumentSerif_400Regular,
    InstrumentSerif_Italic: InstrumentSerif_400Regular_Italic,
  });

  useEffect(() => {
    // Allow audio to play on iOS even when the mute switch is on.
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

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
