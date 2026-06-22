/**
 * Surface.tsx — Card surface and gender-bar wrapper components.
 *
 * Exports:
 *   Card  — paper background, 0.5px divider border, configurable radius.
 *            When `gender` is set, renders a 3px left rail in the gender color
 *            (fem #B43A6C / masc brand / common accentDeep) per the .gbar spec.
 *
 * Usage:
 *   <Card>...</Card>
 *   <Card gender="fem" padded>...</Card>
 *   <Card radius={10}>...</Card>
 */
import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors } from '@/src/lib/theme';
import { ReactNode } from 'react';

type Gender = 'fem' | 'masc' | 'common';

interface CardProps {
  children: ReactNode;
  /**
   * When provided, adds a 3px left rail in the gender color and left-offsets
   * content by 16px (matching the .gbar wireframe rule).
   */
  gender?: Gender;
  /**
   * Add 16px padding on all sides (12px sides + 10px top/bottom per .ucard rule).
   * Defaults to false.
   */
  padded?: boolean;
  /** Border radius override; defaults to 14 (due-tile) or 10 (ucard inner). */
  radius?: number;
  /** Optional style overrides. */
  style?: ViewStyle;
}

/** Map gender to the 3px rail color. */
const genderRailColor: Record<Gender, string> = {
  fem: colors.genderFem,
  masc: colors.brand,
  common: colors.accentDeep,
};

export function Card({ children, gender, padded = false, radius = 14, style }: CardProps) {
  const containerStyle: ViewStyle = {
    backgroundColor: colors.paper,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)', // divider
    borderRadius: radius,
    overflow: 'hidden',
    ...(padded ? { padding: 16 } : {}),
    ...(gender ? { paddingLeft: padded ? 28 : 16 } : {}),
  };

  return (
    <View style={[containerStyle, style]}>
      {gender ? <GenderRail color={genderRailColor[gender]} /> : null}
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Internal sub-component: left gender rail
// ---------------------------------------------------------------------------

interface GenderRailProps {
  color: string;
}

function GenderRail({ color }: GenderRailProps) {
  return (
    <View
      style={
        StyleSheet.create({
          rail: {
            position: 'absolute',
            left: 0,
            top: 10,
            bottom: 10,
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
          },
        }).rail
      }
    />
  );
}
