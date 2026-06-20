/**
 * Chip — Base pill component used for metadata tags, gender labels, and filters.
 *
 * Variants:
 *   default — paperSoft background, 0.5px divider border, primary text
 *   brand   — rgba(31,52,148,0.08) background, brand cobalt text, brand-tint border
 *
 * The `color` prop overrides text and background for gender chips
 * (e.g. fem: #B43A6C over rgba(180,58,108,0.06)).
 *
 * Usage:
 *   <Chip label="Feminine" />
 *   <Chip label="New" variant="brand" />
 *   <Chip label="Feminino" variant="default" color={colors.genderFem} />
 */
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { colors, fonts } from '@/src/lib/theme';

type ChipVariant = 'default' | 'brand';

interface ChipProps {
  /** Text displayed inside the pill. */
  label: string;
  /** Visual variant; defaults to 'default'. */
  variant?: ChipVariant;
  /**
   * Optional color override for text (and a derived tinted background).
   * Intended for gender chips: pass `colors.genderFem`, `colors.brand`, or
   * `colors.accentDeep`; the background is auto-derived as 6% opacity.
   */
  color?: string;
  /** Optional style overrides for the pill container. */
  style?: ViewStyle;
}

export function Chip({ label, variant = 'default', color, style }: ChipProps) {
  // Resolve background + border + text based on variant and color override
  let bg: string;
  let borderColor: string;
  let textColor: string;

  if (color) {
    // Gender chip: custom color → 6% opacity background, colored text
    bg = hexToRgba(color, 0.06);
    borderColor = hexToRgba(color, 0.18);
    textColor = color;
  } else if (variant === 'brand') {
    bg = 'rgba(31,52,148,0.08)';
    borderColor = 'rgba(31,52,148,0.18)';
    textColor = colors.brand;
  } else {
    bg = colors.paperSoft;
    borderColor = 'rgba(0,0,0,0.08)'; // divider
    textColor = '#000000';
  }

  const containerStyle: ViewStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: bg,
    borderWidth: 0.5,
    borderColor,
  };

  const labelStyle: TextStyle = {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    color: textColor,
    lineHeight: 16,
  };

  return (
    <View style={[containerStyle, style]}>
      <Text style={labelStyle}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a 6-digit hex color to rgba(r,g,b,alpha) string. */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
