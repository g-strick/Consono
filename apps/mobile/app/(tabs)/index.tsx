import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-brand">
      <View className="flex-1 items-center justify-center">
        <Text className="text-white text-2xl font-semibold">Bom dia, Léo.</Text>
        <Text className="text-white/75 text-base mt-1">Home · stub</Text>
      </View>
    </SafeAreaView>
  );
}
