/**
 * StatTile — Brand-tint stat tile for streak/session stat grids.
 *
 * Layout: brandTint background, radius 12, padding 12.
 *   value  — Instrument Serif 28px cobalt (Num primitive)
 *   label  — Geist Mono 9px uppercase 0.10em spacing (Mono primitive)
 *   sub    — faint Body 10px (optional)
 *
 * Usage:
 *   <StatTile value="23" label="DAY STREAK" />
 *   <StatTile value="91%" label="RETENTION" sub="Last 30 days" />
 */
import { View, ViewStyle } from 'react-native';
import { colors } from '@/src/lib/theme';
import { Num, Mono, Body } from '@/src/components/Type';

interface StatTileProps {
  /** The primary stat number or value string (e.g. "23", "91%"). */
  value: string | number;
  /** Short uppercase label below the value (Geist Mono, 9px). */
  label: string;
  /** Optional faint sub-line below the label. */
  sub?: string;
  /** Optional style overrides for the tile container. */
  style?: ViewStyle;
}

export function StatTile({ value, label, sub, style }: StatTileProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.brandTint,
          borderRadius: 12,
          padding: 12,
          gap: 2,
        },
        style,
      ]}
    >
      <Num size={28}>{String(value)}</Num>
      <Mono size={9} style={{ letterSpacing: 0.1 * 9 }}>
        {label}
      </Mono>
      {sub ? (
        <Body size={10} tone="faint">
          {sub}
        </Body>
      ) : null}
    </View>
  );
}
