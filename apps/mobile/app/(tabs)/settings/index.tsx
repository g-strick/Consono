import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-black text-2xl font-semibold">Settings</Text>
        <Text className="text-black/60 text-base mt-1">Settings · stub</Text>
      </View>
    </SafeAreaView>
  );
}
