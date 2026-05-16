import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, DueCard } from '@/src/lib/api';
import { StreakChip, StreakState } from '@/src/components/StreakChip';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getStreakState(streakCount: number, dueCount: number): StreakState {
  if (streakCount <= 1) return 'inactive';
  if (dueCount === 0) return 'continued';
  const h = new Date().getHours();
  if (h >= 18) return 'at-risk';
  return 'inactive';
}

function cardCounts(cards: DueCard[]) {
  const counts = { new: 0, learning: 0, review: 0 };
  for (const c of cards) {
    if (c.state === 'new') counts.new++;
    else if (c.state === 'learning' || c.state === 'relearning') counts.learning++;
    else counts.review++;
  }
  return counts;
}

export default function HomeScreen() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cards', 'due'],
    queryFn: () => api.getDueCards(),
    refetchOnWindowFocus: true,
  });

  // V0: streak hardcoded — no user endpoint yet
  const streakCount = 1;
  const cards = data?.cards ?? [];
  const dueCount = cards.length;
  const streakState = getStreakState(streakCount, dueCount);
  const counts = cardCounts(cards);
  const recentCards = [...cards].slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-brand">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-1">
        <TouchableOpacity>
          <Text className="text-white text-2xl leading-none">≡</Text>
        </TouchableOpacity>
        <StreakChip count={streakCount} state={streakState} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : dueCount === 0 && !data ? (
          <EmptyState />
        ) : dueCount === 0 ? (
          <AllDoneState recentCards={recentCards} />
        ) : (
          <DailyPickupState dueCount={dueCount} counts={counts} recentCards={recentCards} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingState() {
  return (
    <View className="items-center justify-center pt-24">
      <ActivityIndicator color="rgba(255,255,255,0.6)" />
    </View>
  );
}

function ErrorState() {
  return (
    <View className="pt-16">
      <Text className="text-white text-3xl font-semibold">Olá, Léo.</Text>
      <Text className="text-white/60 text-base mt-2">
        Couldn't reach the server. Is the API running?
      </Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="pt-16">
      <Text className="text-white text-3xl font-semibold">Bem-vindo, Léo.</Text>
      <Text className="text-white/75 text-base mt-2 mb-10">Your deck is empty.</Text>
      <Text className="text-white/60 text-sm mb-6 leading-relaxed">
        AI proposes images, audio and i+1 examples — you pick and edit.
      </Text>
      <PrimaryButton label="+ Add a word" onPress={() => router.navigate('/(tabs)/add')} />
    </View>
  );
}

function AllDoneState({ recentCards }: { recentCards: DueCard[] }) {
  return (
    <View className="pt-16">
      <Text className="text-white text-3xl font-semibold">Tudo pronto, Léo.</Text>
      <Text className="text-white/75 text-base mt-2 mb-10">All caught up for today.</Text>
      <CTARow />
      {recentCards.length > 0 && <RecentlyAdded cards={recentCards} />}
    </View>
  );
}

function DailyPickupState({
  dueCount,
  counts,
  recentCards,
}: {
  dueCount: number;
  counts: { new: number; learning: number; review: number };
  recentCards: DueCard[];
}) {
  return (
    <View className="pt-12">
      <Text className="text-white text-3xl font-semibold">{getGreeting()}, Léo.</Text>

      {/* DUE NOW tile */}
      <View className="mt-8 mb-2">
        <Text className="text-white/60 text-xs tracking-widest uppercase mb-1">Due now</Text>
        <Text className="text-white text-7xl font-bold leading-none">{dueCount}</Text>
      </View>

      {/* Breakdown */}
      <View className="flex-row gap-4 mb-8">
        {counts.new > 0 && (
          <Text className="text-white/75 text-sm">
            <Text className="font-semibold">{counts.new}</Text> new
          </Text>
        )}
        {counts.learning > 0 && (
          <Text className="text-white/75 text-sm">
            <Text className="font-semibold">{counts.learning}</Text> learning
          </Text>
        )}
        {counts.review > 0 && (
          <Text className="text-white/75 text-sm">
            <Text className="font-semibold">{counts.review}</Text> review
          </Text>
        )}
      </View>

      <PrimaryButton label="▶  Start review" onPress={() => router.push('/review')} />
      <View className="h-6" />
      <CTARow />
      {recentCards.length > 0 && <RecentlyAdded cards={recentCards} />}
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="bg-white rounded-2xl py-4 items-center">
      <Text className="text-brand font-semibold text-base">{label}</Text>
    </TouchableOpacity>
  );
}

function CTARow() {
  return (
    <View className="flex-row gap-3">
      <TouchableOpacity
        onPress={() => router.navigate('/(tabs)/add')}
        className="flex-1 border border-white/30 rounded-xl py-3 items-center"
      >
        <Text className="text-white text-sm font-medium">+ Add a word</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.navigate('/(tabs)/add')}
        className="flex-1 border border-white/30 rounded-xl py-3 items-center"
      >
        <Text className="text-white text-sm font-medium">Paste a sentence</Text>
      </TouchableOpacity>
    </View>
  );
}

function RecentlyAdded({ cards }: { cards: DueCard[] }) {
  return (
    <View className="mt-8">
      <Text className="text-white/60 text-xs tracking-widest uppercase mb-3">Recently added</Text>
      <View className="gap-2">
        {cards.map((card) => (
          <View
            key={card.id}
            className="bg-white/10 rounded-xl px-4 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2">
              {card.gender && (
                <View
                  style={{
                    width: 3,
                    height: 28,
                    borderRadius: 2,
                    backgroundColor:
                      card.gender === 'feminine'
                        ? '#E8658A'
                        : card.gender === 'masculine'
                          ? '#5A8FD4'
                          : '#F0BF38',
                  }}
                />
              )}
              <View>
                <Text className="text-white font-semibold text-base">
                  {card.headword ?? card.sentence_pt}
                </Text>
                {card.gendered_form && (
                  <Text className="text-white/60 text-xs">{card.gendered_form}</Text>
                )}
              </View>
            </View>
            <Text className="text-white/50 text-xs capitalize">{card.state}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
