/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#1F3494',
        'brand-lifted': '#5A8FD4',
        accent: '#F0BF38',
        oled: '#000000',
        'oled-elevated': '#0A1422',
        // Semantic text tokens (light surface)
        content: '#0F2547',
        muted: '#5A6995',
        // Gender bar accents
        'gender-fem': '#E8658A',
        'gender-masc': '#1F3494',
        'gender-common': '#F0BF38',
      },
    },
  },
  plugins: [],
};
