import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api, DueCard } from '@/src/lib/api';

type Filter = 'all' | 'new' | 'learning' | 'review';

const FILTERS: Filter[] = ['all', 'new', 'learning', 'review'];

function filterCards(cards: DueCard[], filter: Filter): DueCard[] {
  if (filter === 'all') return cards;
  if (filter === 'new') return cards.filter((c) => c.state === 'new');
  if (filter === 'learning')
    return cards.filter((c) => c.state === 'learning' || c.state === 'relearning');
  return cards.filter((c) => c.state === 'review');
}

import { useState } from 'react';

export default function CardsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading } = useQuery({
    queryKey: ['cards', 'due'],
    queryFn: () => api.getDueCards(),
  });

  const allCards = data?.cards ?? [];
  const visible = filterCards(allCards, filter);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-content text-2xl font-bold">Cards</Text>
        <Text className="text-muted text-sm mt-1">{allCards.length} total</Text>
      </View>

      {/* Filter tabs */}
      <View className="flex-row px-5 gap-2 mb-2">
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full border"
            style={{
              borderColor: filter === f ? '#1F3494' : '#E5E5E5',
              backgroundColor: filter === f ? '#1F3494' : 'transparent',
            }}
          >
            <Text
              className="text-xs font-medium capitalize"
              style={{ color: filter === f ? '#FFFFFF' : '#5A6995' }}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1F3494" />
        </View>
      ) : visible.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-content text-lg font-semibold text-center">No cards yet.</Text>
          <Text className="text-muted text-base text-center mt-2">Add a word to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 10 }}
          renderItem={({ item }) => <CardRow card={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function CardRow({ card }: { card: DueCard }) {
  const genderColor =
    card.gender === 'feminine' ? '#E8658A' : card.gender === 'masculine' ? '#1F3494' : '#F0BF38';

  return (
    <View className="border border-gray-100 rounded-xl px-4 py-3 flex-row items-center gap-3 bg-white">
      {card.gender && (
        <View style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: genderColor }} />
      )}
      <View className="flex-1">
        <Text className="text-content text-base font-semibold">
          {card.headword ?? card.sentence_pt}
        </Text>
        {card.gendered_form && (
          <Text className="text-muted text-xs mt-0.5">{card.gendered_form}</Text>
        )}
      </View>
      <View
        className="px-2 py-0.5 rounded-full"
        style={{ backgroundColor: stateColor(card.state) + '20' }}
      >
        <Text className="text-xs font-medium capitalize" style={{ color: stateColor(card.state) }}>
          {card.state}
        </Text>
      </View>
    </View>
  );
}

function stateColor(state: DueCard['state']): string {
  if (state === 'new') return '#1F3494';
  if (state === 'learning' || state === 'relearning') return '#F0BF38';
  return '#22C55E';
}
