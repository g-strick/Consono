import { Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// V0: stubbed with static data. Needs review history API at V1.

export default function StreakScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-content text-base">←</Text>
        </TouchableOpacity>
        <Text className="text-content text-base font-semibold">Your streak</Text>
        <View className="w-8" />
      </View>

      <View className="px-5 pt-6 gap-6">
        {/* Hero */}
        <View className="items-center gap-1">
          <Text className="text-brand text-7xl font-bold">1</Text>
          <Text className="text-muted text-base">day streak</Text>
        </View>

        {/* Stats grid */}
        <View className="flex-row gap-3">
          <StatTile label="Longest" value="1" />
          <StatTile label="Retention" value="—" />
          <StatTile label="Reviews" value="0" />
        </View>

        <Text className="text-muted text-xs text-center">
          Detailed stats available after 7 days of reviews.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 border border-gray-100 rounded-xl px-3 py-4 items-center gap-1">
      <Text className="text-content text-2xl font-bold">{value}</Text>
      <Text className="text-muted text-xs">{label}</Text>
    </View>
  );
}
