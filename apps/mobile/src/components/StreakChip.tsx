/**
 * StreakChip — 3-state streak corner chip (52×26) with 280ms fill transition.
 *
 * States:
 *   inactive  — transparent bg, 1px grayRule border, 60% black text/icon
 *   at-risk   — transparent bg, 1.5px brand border, cobalt text/icon
 *   continued — brandFill fill, no border, white text/icon
 *
 * Transition: background + text color animate over exactly 280ms ease-out.
 * The primary transition path is at-risk → continued. No bounce, no overlay, no transform.
 * Number updates instantly (no number animation).
 */
import { useEffect, useRef } from 'react';
import { Animated, Pressable, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/src/lib/theme';

export type StreakState = 'inactive' | 'at-risk' | 'continued';

interface Props {
  count: number;
  state: StreakState;
}

export function StreakChip({ count, state }: Props) {
  // 0 = not-continued (at-risk or inactive), 1 = continued
  const fillAnim = useRef(new Animated.Value(state === 'continued' ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: state === 'continued' ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [state]);

  // Background: transparent → brandFill
  const bgColor = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.brandFill],
  });

  // Border: inactive = grayRule 1px, at-risk = brand 1.5px, continued = no border
  const borderColor = state === 'inactive' ? colors.grayRule : colors.brand;
  const borderWidth = state === 'inactive' ? 1 : state === 'at-risk' ? 1.5 : 0;

  // Text color animation: cobalt (at-risk) or 60% black (inactive) → white (continued)
  // The primary transition is at-risk → continued, so we interpolate from brand → white.
  const fromTextColor = state === 'inactive' ? 'rgba(0,0,0,0.60)' : colors.brand;
  const textColor = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [fromTextColor, '#FFFFFF'],
  });

  // Icon color (static per state since Ionicons doesn't accept animated values)
  const iconColor =
    state === 'continued' ? '#FFFFFF' : state === 'at-risk' ? colors.brand : 'rgba(0,0,0,0.60)';

  // Horizontal padding: 10px in continued state, 9px otherwise (per wireframe)
  const hPad = state === 'continued' ? 10 : 9;

  const countTextStyle: TextStyle = {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    lineHeight: 16,
  };

  return (
    <Pressable onPress={() => router.push('/streak')}>
      <Animated.View
        style={{
          backgroundColor: bgColor,
          borderColor,
          borderWidth,
          borderRadius: 13,
          height: 26,
          paddingHorizontal: hPad,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Ionicons name="flame" size={13} color={iconColor} />
        <Animated.Text style={[countTextStyle, { color: textColor }]}>{count}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}
