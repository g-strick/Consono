import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export type StreakState = 'inactive' | 'at-risk' | 'continued';

interface Props {
  count: number;
  state: StreakState;
}

export function StreakChip({ count, state }: Props) {
  const fillAnim = useRef(new Animated.Value(state === 'continued' ? 1 : 0)).current;

  useEffect(() => {
    if (state === 'continued') {
      Animated.timing(fillAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(fillAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: false,
      }).start();
    }
  }, [state]);

  const bgColor = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#1F3494'],
  });

  const borderColor = state === 'inactive' ? 'rgba(0,0,0,0.30)' : '#1F3494';

  const textColor =
    state === 'continued' ? '#FFFFFF' : state === 'at-risk' ? '#1F3494' : 'rgba(0,0,0,0.60)';

  const iconColor =
    state === 'continued' ? '#FFFFFF' : state === 'at-risk' ? '#1F3494' : 'rgba(0,0,0,0.60)';

  return (
    <Pressable onPress={() => router.push('/streak')}>
      <Animated.View
        style={{
          backgroundColor: bgColor,
          borderColor,
          borderWidth: state === 'continued' ? 0 : 1.5,
          borderRadius: 13,
          height: 26,
          paddingHorizontal: 9,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Ionicons name="flame" size={13} color={iconColor} />
        <Text style={{ fontSize: 12, fontWeight: '500', color: textColor }}>{count}</Text>
      </Animated.View>
    </Pressable>
  );
}
