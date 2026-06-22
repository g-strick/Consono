import { createContext, useContext } from 'react';

export type Surface = 'light' | 'color' | 'oled' | 'gold';

// ============================================================
// V6 COLOR TOKENS
// ============================================================
export const colors = {
  // Brand ramp
  brand: '#1F3494',
  brandDeep: '#142468',
  brandFill: '#2E5BC8', // cobalt used in filled surfaces
  brandTint: '#EFF3FB', // pale stat tile background
  brandTint2: '#E8EEF7',
  brandLight: '#5A8FD4', // OLED lifted brand
  brandSoft: '#7AA0DD', // easy rating

  // Legacy aliases (keep for existing consumers)
  brandLifted: '#5A8FD4',

  // Heatmap intensity ramp
  heat0: '#EFF3FB',
  heat1: '#A5BFE8',
  heat2: '#5A8FD4',
  heat3: '#2E5BC8',

  // Accent
  accent: '#E8B838',
  accentDeep: '#C99A1F',

  // Semantic ratings
  again: '#C84A40',
  hard: '#E8B838',
  good: '#2E5BC8', // = brandFill
  easy: '#7AA0DD', // = brandSoft

  // Surfaces
  paper: '#FFFFFF',
  paperSoft: '#F7F7F8',
  paperSoft2: '#EFEFF1',
  grayRule: '#D5D5D5',

  // Legacy OLED
  oled: '#000000',
  oledElevated: '#0A1422',

  // Gender
  genderFem: '#B43A6C',
  genderMasc: '#1F3494',
  genderCommon: '#C99A1F',

  // Legacy surfaces (kept for backward compat)
  surfaces: {
    light: { bg: '#FFFFFF', text: '#000000', muted: 'rgba(0,0,0,0.60)' },
    color: { bg: '#2E5BC8', text: '#FFFFFF', muted: 'rgba(255,255,255,0.75)' },
    oled: { bg: '#000000', text: '#FFFFFF', muted: 'rgba(255,255,255,0.70)' },
  },
} as const;

// ============================================================
// TEXT RULE: text follows surface, not brand
// Per-surface text color map
// ============================================================
export const textColors = {
  light: {
    primary: '#000000',
    muted: 'rgba(0,0,0,0.60)',
    faint: 'rgba(0,0,0,0.42)',
    brand: '#1F3494', // cobalt emphasis on light/tint
  },
  gold: {
    primary: '#1F3494',
    muted: 'rgba(31,52,148,0.65)',
    faint: 'rgba(31,52,148,0.45)',
    brand: '#1F3494', // same as primary on gold
  },
  color: {
    primary: '#FFFFFF',
    muted: 'rgba(255,255,255,0.75)',
    faint: 'rgba(255,255,255,0.55)',
    brand: '#FFFFFF', // no cobalt on cobalt surface — falls back to primary
  },
  oled: {
    primary: '#FFFFFF',
    muted: 'rgba(255,255,255,0.70)',
    faint: 'rgba(255,255,255,0.50)',
    brand: '#5A8FD4', // lifted brand for OLED emphasis
  },
} as const;

export type TextTone = 'primary' | 'muted' | 'faint' | 'brand';

/** Returns the correct text color string for a given surface + tone.
 *  Enforces the "text follows surface" rule: cobalt is only used
 *  as brand-emphasis on light/oled, never as body copy. */
export function textForSurface(surface: Surface, tone: TextTone = 'primary'): string {
  return textColors[surface][tone];
}

// ============================================================
// FONT FAMILY CONSTANTS
// Keys match the useFonts map in _layout.tsx
// ============================================================
export const fonts = {
  display: 'InstrumentSerif',
  displayItalic: 'InstrumentSerif_Italic',
  ui: 'Geist',
  uiMedium: 'Geist_500Medium',
  uiSemibold: 'Geist_600SemiBold',
  uiBold: 'Geist_700Bold',
  mono: 'GeistMono',
  monoMedium: 'GeistMono_500Medium',
} as const;

// ============================================================
// THEME CONTEXT
// ============================================================
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
