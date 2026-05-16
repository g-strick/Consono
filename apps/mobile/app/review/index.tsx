import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { api, Rating } from '@/src/lib/api';

type Phase = 'intro' | 'front' | 'back' | 'done';

export default function ReviewScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['cards', 'due'],
    queryFn: () => api.getDueCards(),
  });

  const cards = data?.cards ?? [];
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, again: 0, startMs: Date.now() });
  const soundRef = useRef<Audio.Sound | null>(null);

  const reviewMutation = useMutation({
    mutationFn: ({
      card_id,
      rating,
      duration_ms,
    }: {
      card_id: number;
      rating: Rating;
      duration_ms: number;
    }) => api.submitReview(card_id, rating, duration_ms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', 'due'] });
    },
  });

  const cardStartMs = useRef(Date.now());

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const playAudio = useCallback(async (url: string) => {
    try {
      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;
      await sound.playAsync();
    } catch {
      // audio failure is non-fatal
    }
  }, []);

  const currentCard = cards[index];

  useEffect(() => {
    if (phase === 'front' && currentCard?.audio_url) {
      cardStartMs.current = Date.now();
      playAudio(currentCard.audio_url);
    }
  }, [phase, index]);

  function handleBegin() {
    setPhase('front');
  }

  function handleReveal() {
    setPhase('back');
  }

  function handleDontKnow() {
    handleRate('again');
  }

  function handleRate(rating: Rating) {
    if (!currentCard) return;
    const duration_ms = Date.now() - cardStartMs.current;
    reviewMutation.mutate({ card_id: currentCard.id, rating, duration_ms });
    setSessionStats((s) => ({
      ...s,
      reviewed: s.reviewed + 1,
      again: rating === 'again' ? s.again + 1 : s.again,
    }));

    const next = index + 1;
    if (next >= cards.length) {
      setPhase('done');
    } else {
      setIndex(next);
      setPhase('front');
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#1F3494" />
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text className="text-content text-2xl font-semibold text-center">Nothing due.</Text>
          <Text className="text-muted text-base text-center">All caught up for today.</Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-6">
            <Text className="text-brand text-base font-medium">← Back to home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'intro') {
    const counts = { new: 0, review: 0 };
    for (const c of cards) {
      if (c.state === 'new') counts.new++;
      else counts.review++;
    }
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-5 pt-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-content text-base">× Exit</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-8 gap-6">
          <Text className="text-content text-4xl font-bold">Vamos lá.</Text>
          <View className="items-center gap-1">
            <Text className="text-content text-lg font-semibold">
              {cards.length} cards · ~{Math.ceil(cards.length * 0.3)} min
            </Text>
            <Text className="text-muted text-base">
              {counts.new} new · {counts.review} review
            </Text>
          </View>
          <TouchableOpacity onPress={handleBegin} className="bg-brand rounded-2xl px-10 py-4 mt-4">
            <Text className="text-white font-semibold text-base">▶ Begin</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    const elapsed = Math.round((Date.now() - sessionStats.startMs) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const accuracy =
      sessionStats.reviewed > 0
        ? Math.round(((sessionStats.reviewed - sessionStats.again) / sessionStats.reviewed) * 100)
        : 100;

    return (
      <SafeAreaView className="flex-1 bg-brand">
        <View className="flex-1 items-center justify-center px-8 gap-8">
          <Text className="text-white text-5xl font-bold">Acabou.</Text>
          <View className="w-full gap-4">
            <StatRow label="Reviewed" value={String(sessionStats.reviewed)} />
            <StatRow label="Accuracy" value={`${accuracy}%`} />
            <StatRow label="Time" value={`${mins}m ${secs}s`} />
          </View>
          <TouchableOpacity
            onPress={() => {
              queryClient.invalidateQueries({ queryKey: ['cards', 'due'] });
              router.back();
            }}
            className="bg-white rounded-2xl px-10 py-4 mt-4"
          >
            <Text className="text-brand font-semibold text-base">Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentCard) return null;

  if (phase === 'front') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-5 pt-2">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-content text-base">× Exit</Text>
          </TouchableOpacity>
          <Text className="text-muted text-sm">
            {index + 1} / {cards.length}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-8 gap-8">
          <Text className="text-muted text-xs tracking-widest uppercase">Listen</Text>

          <TouchableOpacity
            onPress={() => currentCard.audio_url && playAudio(currentCard.audio_url)}
            className="w-20 h-20 rounded-full bg-brand items-center justify-center"
          >
            <Text className="text-white text-3xl">▶</Text>
          </TouchableOpacity>

          <Text className="text-content text-lg text-center">O que ouves?</Text>
        </View>

        <View className="px-5 pb-6 gap-3">
          <TouchableOpacity onPress={handleDontKnow} className="py-3 items-center">
            <Text className="text-muted text-base">Don't know</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReveal}
            className="bg-brand rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">Reveal ↓</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // phase === 'back'
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-content text-base">× Exit</Text>
        </TouchableOpacity>
        <Text className="text-muted text-sm">
          {index + 1} / {cards.length}
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {currentCard.image_url && (
          <Image
            source={{ uri: currentCard.image_url }}
            className="w-full"
            style={{ height: 220 }}
            resizeMode="cover"
          />
        )}

        <View className="px-5 py-4">
          {/* Headword row with gender bar */}
          <View className="flex-row items-center gap-3 mb-1">
            {currentCard.gender && (
              <View
                style={{
                  width: 3,
                  height: 36,
                  borderRadius: 2,
                  backgroundColor:
                    currentCard.gender === 'feminine'
                      ? '#E8658A'
                      : currentCard.gender === 'masculine'
                        ? '#1F3494'
                        : '#F0BF38',
                }}
              />
            )}
            <View>
              <Text className="text-content text-2xl font-bold">
                {currentCard.headword ?? currentCard.sentence_pt}
              </Text>
              {currentCard.gendered_form && (
                <Text className="text-muted text-sm">{currentCard.gendered_form}</Text>
              )}
            </View>
          </View>

          {currentCard.stress_marker && (
            <Text className="text-muted text-sm mb-1 ml-6">{currentCard.stress_marker}</Text>
          )}
          {currentCard.usage_context && (
            <Text className="text-muted text-sm mb-3 ml-6">{currentCard.usage_context}</Text>
          )}

          {/* Sentence */}
          {currentCard.sentence_pt && (
            <View className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
              <Text className="text-content text-base leading-relaxed">
                {currentCard.sentence_pt}
              </Text>
              {currentCard.sentence_audio_url && (
                <TouchableOpacity
                  onPress={() => playAudio(currentCard.sentence_audio_url!)}
                  className="mt-2"
                >
                  <Text className="text-brand text-sm">▶ play</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {currentCard.sounds_like && (
            <Text className="text-muted text-sm mb-1">sounds like: {currentCard.sounds_like}</Text>
          )}
        </View>
      </ScrollView>

      {/* Rating buttons */}
      <View className="px-5 pb-6">
        <Text className="text-muted text-xs text-center mb-3 uppercase tracking-widest">
          How did it go?
        </Text>
        <View className="flex-row gap-2">
          {(['again', 'hard', 'good', 'easy'] as Rating[]).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => handleRate(r)}
              className="flex-1 rounded-xl py-3 items-center border border-gray-200"
            >
              <Text className="text-content text-sm font-medium capitalize">{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-white/75 text-base">{label}</Text>
      <Text className="text-white text-base font-semibold">{value}</Text>
    </View>
  );
}
