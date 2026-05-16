import { createContext, useContext } from 'react';

export type Surface = 'light' | 'color' | 'oled';

export const colors = {
  brand: '#1F3494',
  brandLifted: '#5A8FD4',
  accent: '#F0BF38',
  oled: '#000000',
  oledElevated: '#0A1422',

  surfaces: {
    light: { bg: '#FFFFFF', text: '#000000', muted: 'rgba(0,0,0,0.60)' },
    color: { bg: '#1F3494', text: '#FFFFFF', muted: 'rgba(255,255,255,0.75)' },
    oled: { bg: '#000000', text: '#FFFFFF', muted: 'rgba(255,255,255,0.70)' },
  },
} as const;

interface ThemeContextValue {
  surface: Surface;
  setSurface: (s: Surface) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  surface: 'light',
  setSurface: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
