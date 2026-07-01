import { useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface SwipeableRowProps {
  onSuspend: () => void;
  onDelete: () => void;
  isSuspended: boolean;
  children: React.ReactNode;
}

export function SwipeableRow({ onSuspend, onDelete, isSuspended, children }: SwipeableRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  function renderRightActions(
    _progress: SharedValue<number>,
    _translation: SharedValue<number>,
    swipeable: SwipeableMethods,
  ) {
    return (
      <View style={{ flexDirection: 'row' }}>
        {/* Suspend/Unsuspend — neutral, non-destructive */}
        <TouchableOpacity
          style={{
            width: 80,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.08)',
            gap: 4,
          }}
          onPress={() => {
            swipeable.close();
            onSuspend();
          }}
        >
          <Ionicons
            name={isSuspended ? 'play-circle' : 'pause-circle'}
            size={22}
            color="rgba(0,0,0,0.60)"
          />
          <Text style={{ color: 'rgba(0,0,0,0.60)', fontSize: 11 }}>
            {isSuspended ? 'Unsuspend' : 'Suspend'}
          </Text>
        </TouchableOpacity>

        {/* Delete — destructive red */}
        <TouchableOpacity
          style={{
            width: 80,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#C84A40',
            gap: 4,
          }}
          onPress={() => {
            swipeable.close();
            onDelete();
          }}
        >
          <Ionicons name="trash" size={22} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 11 }}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      {children}
    </Swipeable>
  );
}
