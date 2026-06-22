import { View, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, DueCard, RecentCard } from '@/src/lib/api';
import { StreakChip, StreakState } from '@/src/components/StreakChip';
import { Display, Body, Mono, Num, Action } from '@/src/components/Type';
import { Chip } from '@/src/components/Chip';
import { Card } from '@/src/components/Surface';
import { colors } from '@/src/lib/theme';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** "Olá, Léo." when a name is known, "Olá." while it loads or is unavailable. */
function withName(prefix: string, name: string): string {
  return name ? `${prefix}, ${name}.` : `${prefix}.`;
}

function getStreakState(
  streak: { count: number; active: boolean; reviewedToday: boolean } | undefined,
  dueCount: number,
): StreakState {
  if (!streak || !streak.active) return 'inactive';
  if (streak.reviewedToday) return 'continued';
  if (dueCount > 0) return 'at-risk';
  return 'continued';
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

/** Returns a "next batch · Xh" or "next batch · Xm" label from an ISO nextDueAt string. */
export function computeNextBatchLabel(nextDueAt: string | null): string {
  if (!nextDueAt) return 'next batch · —';
  const diffMs = new Date(nextDueAt).getTime() - Date.now();
  if (diffMs <= 0) return 'next batch · —';
  const totalMins = diffMs / 1000 / 60;
  if (totalMins < 60) {
    return `next batch · ${Math.round(totalMins)}m`;
  }
  return `next batch · ${Math.round(totalMins / 60)}h`;
}

export default function HomeScreen() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cards', 'due'],
    queryFn: () => api.getDueCards(),
    refetchOnWindowFocus: true,
  });

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.getMe(),
    staleTime: 1000 * 60 * 60,
  });

  const { data: homeSummary } = useQuery({
    queryKey: ['home', 'summary'],
    queryFn: () => api.getHomeSummary(),
    refetchOnWindowFocus: true,
  });

  const streakCount = homeSummary?.streak.count ?? 0;
  const name = me?.name ?? '';
  const cards = data?.cards ?? [];
  const dueCount = cards.length;
  const streakState = getStreakState(homeSummary?.streak, dueCount);
  const counts = cardCounts(cards);
  const recentCards: RecentCard[] = homeSummary?.recentCards ?? [];

  return (
    <SafeAreaView style={styles.root}>
      {/* Topbar: icon-btn (≡) on left, StreakChip on right */}
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.iconBtn}>
          <Action surface="light" tone="primary" size={16}>
            ≡
          </Action>
        </TouchableOpacity>
        <StreakChip count={streakCount} state={streakState} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState name={name} />
        ) : homeSummary?.totalCards === 0 ? (
          <EmptyState name={name} />
        ) : dueCount > 0 ? (
          <DailyPickupState
            name={name}
            dueCount={dueCount}
            counts={counts}
            recentCards={recentCards}
          />
        ) : (
          <AllDoneState
            name={name}
            todayStats={homeSummary?.todayStats ?? { reviewed: 0, again: 0 }}
            nextBatchLabel={computeNextBatchLabel(homeSummary?.nextDueAt ?? null)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

function ErrorState({ name }: { name: string }) {
  return (
    <View style={styles.stateContainer}>
      <Display surface="light">{withName('Olá', name)}</Display>
      <Body surface="light" tone="muted" size={13} style={styles.subtitle}>
        Couldn't reach the server. Is the API running?
      </Body>
    </View>
  );
}

/** H.3 — Inactive / Day 1: gray chip, Bem-vindo, empty-deck prompt, + Add, try-these chips */
function EmptyState({ name }: { name: string }) {
  return (
    <View style={styles.stateContainer}>
      <Greeting text={withName('Bem-vindo', name)} subtitle="Your deck is empty." />

      {/* Empty-deck prompt tile */}
      <Card style={styles.dueTile}>
        <Mono surface="light" style={styles.dueLabel}>
          start with
        </Mono>
        <Display surface="light" size={28} style={styles.emptyDeckHeadline}>
          A word, or a sentence.
        </Display>
        <Body surface="light" tone="muted" size={12} style={styles.emptyDeckHelper}>
          AI proposes images, audio and i+1 examples — you pick and edit.
        </Body>
      </Card>

      <BrandButton
        label="+ Add a word or sentence"
        onPress={() => router.navigate('/(tabs)/add')}
      />

      <Mono surface="light" style={styles.sectionLabel}>
        try one of these
      </Mono>
      <View style={styles.chipRow}>
        {['saudade', 'feijoada', 'ficar', 'já'].map((word) => (
          <Chip key={word} label={word} />
        ))}
      </View>
    </View>
  );
}

/** H.1 — Continued today: filled chip, Tudo pronto, due-0 tile, + Add alt, today stats */
function AllDoneState({
  name,
  todayStats,
  nextBatchLabel,
}: {
  name: string;
  todayStats: { reviewed: number; again: number };
  nextBatchLabel: string;
}) {
  const { reviewed, again } = todayStats;
  const accuracy = reviewed > 0 ? `${Math.round(((reviewed - again) / reviewed) * 100)}%` : '—';

  return (
    <View style={styles.stateContainer}>
      <Greeting text={withName('Tudo pronto', name)} subtitle="All caught up for today." />

      {/* Due tile — 0 due, shows next-batch chip */}
      <DueTile
        dueCount={0}
        counts={{ new: 0, learning: 0, review: 0 }}
        allDone
        nextBatchLabel={nextBatchLabel}
      />

      <AltButton label="+ Add" onPress={() => router.navigate('/(tabs)/add')} />

      {/* Today stats card */}
      <Mono surface="light" style={styles.sectionLabel}>
        today
      </Mono>
      <Card style={styles.statsCard}>
        <View style={styles.statRow}>
          <Body surface="light" tone="muted" size={12}>
            reviewed
          </Body>
          <Body surface="light" weight="bold" size={12}>
            {reviewed}
          </Body>
        </View>
        <View style={styles.statRow}>
          <Body surface="light" tone="muted" size={12}>
            accuracy
          </Body>
          <Body surface="light" weight="bold" size={12}>
            {accuracy}
          </Body>
        </View>
      </Card>
    </View>
  );
}

/** H.2 — Daily pickup: at-risk chip, greeting, due tile, Start review, recently added */
function DailyPickupState({
  name,
  dueCount,
  counts,
  recentCards,
}: {
  name: string;
  dueCount: number;
  counts: { new: number; learning: number; review: number };
  recentCards: RecentCard[];
}) {
  const mins = Math.round(dueCount * 0.3);
  const subtitle = `${dueCount} cards due · about ${mins} minute${mins !== 1 ? 's' : ''}.`;

  return (
    <View style={styles.stateContainer}>
      <Greeting text={withName(getGreeting(), name)} subtitle={subtitle} />

      <DueTile dueCount={dueCount} counts={counts} allDone={false} />

      <BrandButton label="▶ Start review" onPress={() => router.push('/review')} />

      {recentCards.length > 0 && <RecentlyAdded cards={recentCards} />}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/** Surface-driven greeting: Display (serif) with Body subtitle muted */
function Greeting({ text, subtitle }: { text: string; subtitle: string }) {
  // Split "Tudo pronto, Léo." into prefix + name for italic name rendering
  const commaIdx = text.lastIndexOf(', ');
  const hasSeparator = commaIdx !== -1;
  const prefix = hasSeparator ? text.slice(0, commaIdx) : text.replace(/\.$/, '');
  const namePart = hasSeparator ? text.slice(commaIdx + 2) : null; // includes trailing "."

  return (
    <View style={styles.greetContainer}>
      <Display surface="light" style={styles.greetText}>
        {hasSeparator ? (
          <>
            {prefix},{' '}
            <Display surface="light" italic tone="muted">
              {namePart}
            </Display>
          </>
        ) : (
          text
        )}
      </Display>
      <Body surface="light" tone="muted" size={13} style={styles.subtitle}>
        {subtitle}
      </Body>
    </View>
  );
}

/** Paper Card with Mono label, Num due count (cobalt), breakdown chips */
function DueTile({
  dueCount,
  counts,
  allDone,
  nextBatchLabel,
}: {
  dueCount: number;
  counts: { new: number; learning: number; review: number };
  allDone: boolean;
  nextBatchLabel?: string;
}) {
  return (
    <Card style={styles.dueTile}>
      <Mono surface="light" style={styles.dueLabel}>
        due now
      </Mono>
      <Num surface="light">{dueCount}</Num>
      <View style={styles.chipRow}>
        {allDone ? (
          <Chip label={nextBatchLabel ?? 'next batch · —'} variant="brand" />
        ) : (
          <>
            {counts.new > 0 && <Chip label={`${counts.new} new`} variant="brand" />}
            {counts.learning > 0 && <Chip label={`${counts.learning} learning`} />}
            {counts.review > 0 && <Chip label={`${counts.review} review`} />}
          </>
        )}
      </View>
    </Card>
  );
}

/** recently added section label + word cards */
function RecentlyAdded({ cards }: { cards: RecentCard[] }) {
  return (
    <View style={styles.recentlySection}>
      <Mono surface="light" style={styles.sectionLabel}>
        recently added
      </Mono>
      <View style={styles.wordCardList}>
        {cards.map((card) => {
          const genderProp =
            card.gender === 'feminine'
              ? ('fem' as const)
              : card.gender === 'masculine'
                ? ('masc' as const)
                : card.gender === 'common'
                  ? ('common' as const)
                  : undefined;

          // Gender chip label + color
          const genderChipLabel =
            card.gender === 'feminine'
              ? 'fem.'
              : card.gender === 'masculine'
                ? 'masc.'
                : card.gender === 'common'
                  ? 'common'
                  : null;
          const genderChipColor =
            card.gender === 'feminine'
              ? colors.genderFem
              : card.gender === 'masculine'
                ? colors.brand
                : card.gender === 'common'
                  ? colors.accentDeep
                  : undefined;

          return (
            <Card key={card.id} gender={genderProp} radius={10} style={styles.wordCard}>
              <View style={styles.wordCardRow}>
                <Body surface="light" weight="semibold" size={14}>
                  {card.headword ?? card.sentence_pt}
                </Body>
                {genderChipLabel && (
                  <Chip
                    label={genderChipLabel}
                    color={genderChipColor}
                    style={styles.wordCardChip}
                  />
                )}
              </View>
              <Body surface="light" tone="muted" size={11} style={styles.wordCardMeta}>
                {card.state === 'new' ? 'due now' : card.state}
              </Body>
            </Card>
          );
        })}
      </View>
    </View>
  );
}

/** Brand-fill primary action button (cobalt bg, white text) */
function BrandButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.brandBtn}>
      <Action surface="color" size={15}>
        {label}
      </Action>
    </TouchableOpacity>
  );
}

/** Alt / secondary button (paper bg, black text, gray border) */
function AltButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.altBtn}>
      <Action surface="light" tone="primary" size={15}>
        {label}
      </Action>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 96,
  },
  stateContainer: {
    paddingTop: 12,
  },
  greetContainer: {
    marginBottom: 16,
  },
  greetText: {
    // Display component handles font/size; just spacing
  },
  subtitle: {
    marginTop: 4,
  },
  dueTile: {
    marginTop: 8,
    marginBottom: 12,
    padding: 16,
    gap: 8,
  },
  dueLabel: {
    // Mono handles uppercase + letter-spacing
  },
  emptyDeckHeadline: {
    marginTop: 4,
  },
  emptyDeckHelper: {
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  brandBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.brandDeep,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  altBtn: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.grayRule,
    marginBottom: 4,
  },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 6,
  },
  statsCard: {
    padding: 12,
    borderRadius: 12,
    gap: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  recentlySection: {
    marginTop: 4,
  },
  wordCardList: {
    gap: 6,
  },
  wordCard: {
    paddingVertical: 10,
    paddingRight: 12,
  },
  wordCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordCardChip: {
    marginLeft: 'auto',
  },
  wordCardMeta: {
    marginTop: 2,
  },
});
