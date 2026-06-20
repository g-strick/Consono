import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import Svg, { Path } from 'react-native-svg';
import { api, Rating } from '@/src/lib/api';
import { colors } from '@/src/lib/theme';
import { useNightSurface } from '@/src/lib/useNightSurface';
import { Display, Heading, Body, Mono, Action } from '@/src/components/Type';
import { RatingButtons } from '@/src/components/RatingButtons';
import { StreakChip } from '@/src/components/StreakChip';

type Phase = 'intro' | 'front' | 'back' | 'done';

// Real streak wiring lands in Phase 2 (STRK-01/STRK-02). For the v6 reskin the
// chip state is what matters (at-risk pre-completion → continued on done); the
// count is a placeholder until the streak aggregation endpoint exists.
const STREAK_PLACEHOLDER = 12;

// v6 waveform — a single static SVG path rendered on the audio-only front.
const WAVEFORM_PATH =
  'M0 15 Q 5 4 10 15 T 20 15 Q 25 2 30 15 T 40 15 Q 45 7 50 15 T 60 15 Q 65 1 70 15 T 80 15 Q 85 6 90 15 T 100 15 Q 105 3 110 15 T 120 15 Q 125 8 130 15 T 140 15 Q 145 5 150 15 T 160 15 Q 165 2 170 15 T 180 15';

function genderColor(gender?: string | null): string {
  if (gender === 'feminine') return colors.genderFem;
  if (gender === 'masculine') return colors.genderMasc;
  return colors.genderCommon;
}

export default function ReviewScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['cards', 'due'],
    queryFn: () => api.getDueCards(),
  });

  // OLED night theme (DSGN-01): dark mode + night hours → 'oled', else 'light'.
  const nightSurface = useNightSurface();
  const isOled = nightSurface === 'oled';
  const screenBg = isOled ? colors.oled : colors.paper;

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
  });

  function exitReview() {
    queryClient.invalidateQueries({ queryKey: ['cards', 'due'] });
    router.back();
  }

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
    if (phase === 'front' && currentCard?.sentence_audio_url) {
      cardStartMs.current = Date.now();
      playAudio(currentCard.sentence_audio_url);
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
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: screenBg }}
      >
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: screenBg }}>
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Display surface={nightSurface}>Nothing due.</Display>
          <Body surface={nightSurface} tone="muted">
            All caught up for today.
          </Body>
          <TouchableOpacity onPress={() => router.back()} className="mt-6">
            <Action surface={nightSurface}>← Back to home</Action>
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
    const estMin = Math.max(1, Math.ceil(cards.length * 0.3));
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: screenBg }}>
        <View className="flex-row items-center justify-between px-5 pt-2">
          <TouchableOpacity onPress={exitReview}>
            <Action surface={nightSurface} tone="muted">
              × Exit
            </Action>
          </TouchableOpacity>
          <StreakChip count={STREAK_PLACEHOLDER} state="at-risk" />
        </View>
        <View className="flex-1 items-center justify-center px-8 gap-5">
          <Display surface={nightSurface} size={40}>
            Vamos lá.
          </Display>
          <Heading surface={nightSurface} tone="muted">
            {cards.length} cards · ~{estMin} min
          </Heading>
          <View className="flex-row gap-2">
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: isOled ? colors.brandLight : colors.brandTint }}
            >
              <Mono surface={nightSurface} tone="brand">
                {counts.new} new
              </Mono>
            </View>
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: isOled ? 'rgba(255,255,255,0.08)' : colors.paperSoft2 }}
            >
              <Mono surface={nightSurface}>{counts.review} review</Mono>
            </View>
          </View>
          <Mono surface={nightSurface} tone="faint" style={{ marginTop: 4 }}>
            audio first · no text on front
          </Mono>
          <TouchableOpacity
            onPress={handleBegin}
            className="rounded-2xl px-10 py-4 mt-4 w-full items-center"
            style={{ backgroundColor: colors.brand }}
          >
            <Action surface="color" size={16}>
              ▶ Begin
            </Action>
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
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.brandFill }}>
        <View className="flex-row items-center justify-between px-5 pt-2">
          <TouchableOpacity onPress={exitReview}>
            <Action surface="color" tone="muted">
              × Complete
            </Action>
          </TouchableOpacity>
          {/* continued state celebrates the streak tick via the 280ms fill */}
          <StreakChip count={STREAK_PLACEHOLDER + 1} state="continued" />
        </View>

        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Mono surface="color" style={{ color: 'rgba(255,255,255,0.55)' }}>
            today&apos;s session
          </Mono>
          <Display surface="color" size={48}>
            Acabou.
          </Display>
          <Display surface="color" size={56} style={{ color: colors.accent }}>
            {sessionStats.reviewed}/{cards.length}
          </Display>

          <View
            className="w-full rounded-2xl px-5 py-4 gap-3 mt-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <DoneStat label="Reviewed" value={String(sessionStats.reviewed)} />
            <DoneStat label="Accuracy" value={`${accuracy}%`} />
            <DoneStat label="Time" value={`${mins}m ${secs}s`} />
          </View>

          <TouchableOpacity
            onPress={exitReview}
            className="rounded-2xl px-10 py-4 mt-4 w-full items-center"
            style={{ backgroundColor: colors.paper }}
          >
            <Action tone="brand" size={16}>
              Home
            </Action>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentCard) return null;

  if (phase === 'front') {
    const progress = (index + 1) / cards.length;
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: screenBg }}>
        {/* gold 3px progress bar */}
        <View
          style={{
            height: 3,
            backgroundColor: isOled ? 'rgba(255,255,255,0.10)' : colors.paperSoft2,
          }}
        >
          <View
            style={{ height: 3, width: `${progress * 100}%`, backgroundColor: colors.accent }}
          />
        </View>

        <View className="flex-row items-center justify-between px-5 pt-2">
          <TouchableOpacity onPress={exitReview}>
            <Action surface={nightSurface} tone="muted">
              × Exit
            </Action>
          </TouchableOpacity>
          <Mono surface={nightSurface} tone="faint">
            {index + 1} / {cards.length}
          </Mono>
        </View>

        <View className="flex-1 items-center justify-center px-8 gap-7">
          <Mono surface={nightSurface} tone="faint">
            listen
          </Mono>

          {/* 76px round gold play button with v6 shadow */}
          <TouchableOpacity
            onPress={() =>
              currentCard.sentence_audio_url && playAudio(currentCard.sentence_audio_url)
            }
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.accentDeep,
              shadowOpacity: 0.4,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
            }}
          >
            <Action surface="gold" size={30} style={{ marginLeft: 4 }}>
              ▶
            </Action>
          </TouchableOpacity>

          {/* waveform */}
          <Svg width={180} height={30} viewBox="0 0 180 30">
            <Path
              d={WAVEFORM_PATH}
              stroke={isOled ? colors.brandLight : colors.brand}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>

          <Display surface={nightSurface} tone="muted" italic size={28}>
            O que ouves?
          </Display>

          <Mono surface={nightSurface} tone="faint">
            tap to replay · 0.7× · 1.0× · 1.2×
          </Mono>
        </View>

        <View className="px-5 pb-6 gap-3">
          <TouchableOpacity onPress={handleDontKnow} className="py-3 items-center">
            <Body surface={nightSurface} tone="muted">
              Don&apos;t know
            </Body>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReveal}
            className="rounded-2xl py-4 items-center"
            style={{ backgroundColor: colors.brand }}
          >
            <Action surface="color" size={16}>
              Reveal ↓
            </Action>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // phase === 'back' (reveal & rate)
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: screenBg }}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <TouchableOpacity onPress={exitReview}>
          <Action surface={nightSurface} tone="muted">
            × Exit
          </Action>
        </TouchableOpacity>
        <Mono surface={nightSurface} tone="faint">
          {index + 1} / {cards.length}
        </Mono>
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
          {/* Headword card with gender rail */}
          <View
            className="flex-row items-center gap-3 mb-3 rounded-2xl px-4 py-3"
            style={{
              backgroundColor: isOled ? colors.oledElevated : colors.paperSoft,
            }}
          >
            {currentCard.gender && (
              <View
                style={{
                  width: 3,
                  height: 36,
                  borderRadius: 2,
                  backgroundColor: genderColor(currentCard.gender),
                }}
              />
            )}
            <View className="flex-1">
              <Heading surface={nightSurface}>
                {currentCard.headword ?? currentCard.sentence_pt}
              </Heading>
              {currentCard.gendered_form && (
                <Body surface={nightSurface} tone="muted" size={13}>
                  {currentCard.gendered_form}
                </Body>
              )}
            </View>
            {currentCard.gender && (
              <View
                className="rounded-full px-2 py-1"
                style={{ backgroundColor: isOled ? 'rgba(255,255,255,0.08)' : colors.paperSoft2 }}
              >
                <Mono surface={nightSurface} style={{ color: genderColor(currentCard.gender) }}>
                  {currentCard.gender}
                </Mono>
              </View>
            )}
          </View>

          {currentCard.stress_marker && (
            <Mono surface={nightSurface} tone="muted" style={{ marginBottom: 4, marginLeft: 6 }}>
              {currentCard.stress_marker}
            </Mono>
          )}
          {currentCard.usage_context && (
            <Body
              surface={nightSurface}
              tone="muted"
              size={13}
              style={{ marginBottom: 8, marginLeft: 6 }}
            >
              {currentCard.usage_context}
            </Body>
          )}

          {/* Sentence */}
          {currentCard.sentence_pt && (
            <View
              className="rounded-xl px-4 py-3 mb-3"
              style={{ backgroundColor: isOled ? colors.oledElevated : colors.paperSoft }}
            >
              <Body surface={nightSurface} size={16}>
                {currentCard.sentence_pt}
              </Body>
              {currentCard.sentence_audio_url && (
                <TouchableOpacity
                  onPress={() => playAudio(currentCard.sentence_audio_url!)}
                  className="mt-2"
                >
                  <Action surface={nightSurface}>▶ play</Action>
                </TouchableOpacity>
              )}
            </View>
          )}

          {currentCard.sounds_like && (
            <Body surface={nightSurface} tone="muted" size={13}>
              sounds like: {currentCard.sounds_like}
            </Body>
          )}
        </View>
      </ScrollView>

      {/* Rate */}
      <View className="px-5 pb-6">
        <Mono surface={nightSurface} tone="muted" style={{ textAlign: 'center', marginBottom: 10 }}>
          how did it go?
        </Mono>
        <RatingButtons onRate={handleRate} />
      </View>
    </SafeAreaView>
  );
}

function DoneStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Mono surface="color" style={{ color: 'rgba(255,255,255,0.65)' }}>
        {label}
      </Mono>
      <Body surface="color" weight="semibold" size={15}>
        {value}
      </Body>
    </View>
  );
}
