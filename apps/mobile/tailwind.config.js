/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Brand ramp ───────────────────────────────────────
        brand: '#1F3494',
        'brand-deep': '#142468',
        'brand-fill': '#2E5BC8',
        'brand-tint': '#EFF3FB',
        'brand-tint-2': '#E8EEF7',
        'brand-light': '#5A8FD4',
        'brand-soft': '#7AA0DD',

        // ── Heatmap ramp ─────────────────────────────────────
        'heat-0': '#EFF3FB',
        'heat-1': '#A5BFE8',
        'heat-2': '#5A8FD4',
        'heat-3': '#2E5BC8',

        // ── Accent ───────────────────────────────────────────
        accent: '#E8B838',
        'accent-deep': '#C99A1F',

        // ── Semantic ratings ─────────────────────────────────
        again: '#C84A40',

        // ── OLED ─────────────────────────────────────────────
        oled: '#000000',
        'oled-elevated': '#0A1422',

        // ── Surfaces / paper ─────────────────────────────────
        paper: '#FFFFFF',
        'paper-soft': '#F7F7F8',
        'paper-soft-2': '#EFEFF1',
        'gray-rule': '#D5D5D5',

        // ── Gender bar accents ───────────────────────────────
        'gender-fem': '#B43A6C',
        'gender-masc': '#1F3494',
        'gender-common': '#C99A1F',
      },
      fontFamily: {
        geist: ['Geist'],
        'geist-medium': ['Geist_500Medium'],
        'geist-semibold': ['Geist_600SemiBold'],
        'geist-bold': ['Geist_700Bold'],
        mono: ['GeistMono'],
        'mono-medium': ['GeistMono_500Medium'],
        serif: ['InstrumentSerif'],
        'serif-italic': ['InstrumentSerif_Italic'],
      },
    },
  },
  plugins: [],
};
