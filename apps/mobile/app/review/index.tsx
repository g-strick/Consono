import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function ReviewScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center gap-4">
        <Text className="text-black text-2xl font-semibold">Review session</Text>
        <Text className="text-black/60 text-base">Review flow · stub</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-8">
          <Text className="text-brand text-base">Exit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
