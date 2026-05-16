import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
      <Text className="text-content text-base">{label}</Text>
      <Text className="text-muted text-base">{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-content text-2xl font-bold">Settings</Text>
      </View>

      <View className="px-5 mt-4">
        <Text className="text-muted text-xs tracking-widest uppercase mb-2">About</Text>
        <SettingRow label="Version" value={version} />
        <SettingRow label="Language" value="Brazilian Portuguese" />
        <SettingRow label="TTS voice" value="Felipe (Narakeet)" />
        <SettingRow label="User" value="Léo (V0 hardcoded)" />
      </View>

      <View className="px-5 mt-6">
        <Text className="text-muted text-xs tracking-widest uppercase mb-2">Audio</Text>
        <SettingRow label="Playback speed" value="1.0×" />
      </View>
    </SafeAreaView>
  );
}
