/**
 * streak/index.tsx — v6 Streak detail screen (§4).
 *
 * Layout: detail-nav → compact hero (flame + cobalt streak number + mono caps
 * line) → period toggle (month / year / lifetime, default year) → 2×2 stat grid
 * → period-scoped activity (year heatmap / month calendar / lifetime bars) →
 * reviews bar chart → rating distribution → personal bests.
 *
 * Real streak aggregation queries land in Phase 3 (STRK / DATA). Until then the
 * per-period values below are clearly-marked static placeholders — they are NOT
 * live data. Only the v6 layout, palette, and the working period toggle are real
 * this phase.
 */
import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/lib/theme';
import { Body, Mono, Num } from '@/src/components/Type';
import { StatTile } from '@/src/components/StatTile';
import { Card } from '@/src/components/Surface';
import { YearHeatmap, MonthHeatmap } from '@/src/components/Heatmap';
import { RatingDistribution } from '@/src/components/RatingDistribution';

type Period = 'month' | 'year' | 'lifetime';

// ===========================================================================
// Phase 3: real aggregation. Everything below is static placeholder data that
// stands in for the streak/review-history queries until Phase 3 wires them up.
// ===========================================================================

/** Global hero (current streak) — not period-scoped. */
const HERO = { streak: 13, longest: 17, retention: 85 };

interface Stat {
  value: string;
  label: string;
  sub: string;
}

const STATS: Record<Period, Stat[]> = {
  month: [
    { value: '13', label: 'longest', sub: 'this month' },
    { value: '88%', label: 'retention', sub: 'past 30 days' },
    { value: '214', label: 'reviews', sub: 'past 30 days' },
    { value: '24', label: 'days active', sub: 'of 31' },
  ],
  year: [
    { value: '17', label: 'longest', sub: 'jan 4 – jan 21' },
    { value: '85%', label: 'retention', sub: 'past year' },
    { value: '1,247', label: 'reviews', sub: 'past year' },
    { value: '218', label: 'days active', sub: 'past year' },
  ],
  lifetime: [
    { value: '17', label: 'longest', sub: 'all time' },
    { value: '84%', label: 'retention', sub: 'all time' },
    { value: '5,932', label: 'reviews', sub: 'all time' },
    { value: '412', label: 'days active', sub: 'since jan 2025' },
  ],
};

const RATING: Record<
  Period,
  { percents: { again: number; hard: number; good: number; easy: number }; total: number }
> = {
  month: { percents: { again: 6, hard: 15, good: 60, easy: 19 }, total: 214 },
  year: { percents: { again: 8, hard: 18, good: 56, easy: 18 }, total: 1247 },
  lifetime: { percents: { again: 9, hard: 17, good: 55, easy: 19 }, total: 5932 },
};

/** Deterministic pseudo-random intensity 0–3 for a heat cell index. */
function genLevel(i: number): number {
  const seed = (i * 2654435761) % 100;
  if (seed > 82) return 3;
  if (seed > 58) return 2;
  if (seed > 32) return 1;
  return 0;
}

/** 53×7 = 371 day intensities for the year heatmap. */
const YEAR_LEVELS = Array.from({ length: 371 }, (_, i) => genLevel(i));
const YEAR_TODAY = 370;
// 26 axis slots, month names every 4th (jun → apr), rest blank.
const YEAR_MONTHS = [
  'jun',
  '',
  '',
  '',
  'aug',
  '',
  '',
  '',
  'oct',
  '',
  '',
  '',
  'dec',
  '',
  '',
  '',
  'feb',
  '',
  '',
  '',
  'apr',
  '',
  '',
  '',
  '',
  '',
];

// May (placeholder): 4 leading empty days (1st = Fri, Mon-first), then 31 days.
const MONTH_DAYS: (number | null)[] = [
  ...Array(4).fill(null),
  ...Array.from({ length: 31 }, (_, i) => genLevel(i + 7)),
];
const MONTH_TODAY = 4 + 20; // 21st

/** Reviews bar chart values (0–1 normalized) + tick labels per period. */
const REVIEWS: Record<Period, { bars: number[]; labels: string[] }> = {
  month: {
    bars: Array.from({ length: 30 }, (_, i) => 0.2 + ((i * 7) % 10) / 12),
    labels: [
      '1',
      '',
      '',
      '',
      '',
      '8',
      '',
      '',
      '',
      '',
      '15',
      '',
      '',
      '',
      '',
      '22',
      '',
      '',
      '',
      '',
      '29',
      '',
    ],
  },
  year: {
    bars: [0.45, 0.6, 0.5, 0.72, 0.8, 0.55, 0.4, 0.62, 0.7, 0.85, 0.9, 1],
    labels: ['J', 'J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M', 'A', 'M'],
  },
  lifetime: {
    bars: [0.3, 0.45, 0.4, 0.55, 0.6, 0.5, 0.7, 0.65, 0.8, 0.72, 0.85, 0.9, 0.95, 1],
    labels: ['', '', '', 'jul', '', '', '', 'jan', '', '', '', 'jul', '', 'now'],
  },
};

interface Best {
  rank: string;
  days: number;
  dates: string;
  current?: boolean;
}

const BESTS: Best[] = [
  { rank: '→', days: 13, dates: 'may 3 – today', current: true },
  { rank: '1', days: 17, dates: 'jan 4 – jan 21' },
  { rank: '2', days: 9, dates: 'mar 2 – mar 10' },
  { rank: '3', days: 6, dates: 'aug 14 – aug 19' },
];

// ===========================================================================

export default function StreakScreen() {
  const [period, setPeriod] = useState<Period>('year');

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn} hitSlop={8}>
            <Body surface="light" tone="brand" weight="medium" size={14}>
              ←
            </Body>
          </TouchableOpacity>
          <Body surface="light" weight="semibold" size={14}>
            Your streak
          </Body>
          <TouchableOpacity style={[styles.navBtn, styles.navBtnRight]} hitSlop={8}>
            <Body surface="light" tone="brand" weight="medium" size={14}>
              ↗
            </Body>
          </TouchableOpacity>
        </View>

        {/* Compact hero */}
        <View style={styles.hero}>
          <Ionicons name="flame" size={30} color={colors.accent} />
          <View style={styles.heroCol}>
            <Num surface="light" size={44}>
              {HERO.streak}
            </Num>
            <View style={styles.heroLine}>
              <Mono surface="light" tone="muted" size={10}>
                day streak
              </Mono>
              <Mono surface="light" tone="faint" size={10}>
                ·
              </Mono>
              <Mono surface="light" tone="muted" size={10}>
                longest {HERO.longest}
              </Mono>
              <Mono surface="light" tone="faint" size={10}>
                ·
              </Mono>
              <Mono surface="light" tone="muted" size={10}>
                retention {HERO.retention}%
              </Mono>
            </View>
          </View>
        </View>

        {/* Period toggle */}
        <View style={styles.toggle}>
          {(['month', 'year', 'lifetime'] as Period[]).map((p) => {
            const on = p === period;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={[styles.seg, on && styles.segOn]}
                activeOpacity={0.8}
              >
                <Body
                  surface="light"
                  tone={on ? 'primary' : 'muted'}
                  weight="medium"
                  size={11}
                  style={styles.segText}
                >
                  {p}
                </Body>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stat grid 2×2 */}
        <View style={styles.statGrid}>
          {STATS[period].map((s) => (
            <StatTile
              key={s.label}
              value={s.value}
              label={s.label}
              sub={s.sub}
              style={styles.statTile}
            />
          ))}
        </View>

        {/* Activity — period-scoped */}
        {period === 'year' ? (
          <YearHeatmap
            levels={YEAR_LEVELS}
            todayIndex={YEAR_TODAY}
            monthLabels={YEAR_MONTHS}
            style={styles.section}
          />
        ) : period === 'month' ? (
          <MonthHeatmap
            days={MONTH_DAYS}
            todayIndex={MONTH_TODAY}
            monthLabel="May"
            style={styles.section}
          />
        ) : (
          <LifetimeBars style={styles.section} />
        )}

        {/* Reviews bar chart */}
        <ReviewsChart
          period={period}
          bars={REVIEWS[period].bars}
          labels={REVIEWS[period].labels}
          style={styles.section}
        />

        {/* Rating distribution */}
        <RatingDistribution
          percents={RATING[period].percents}
          total={RATING[period].total}
          style={styles.section}
        />

        {/* Personal bests */}
        <Card radius={12} style={styles.section}>
          {BESTS.map((b, i) => (
            <BestRow key={b.rank} best={b} last={i === BESTS.length - 1} />
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Reviews bar chart (brand-fill bars, last/current highlighted)
// ---------------------------------------------------------------------------

function ReviewsChart({
  period,
  bars,
  labels,
  style,
}: {
  period: Period;
  bars: number[];
  labels: string[];
  style?: object;
}) {
  const meta =
    period === 'year' ? 'past 12 months' : period === 'month' ? 'this month' : 'all time';
  return (
    <Card padded radius={12} style={style}>
      <View style={styles.detTop}>
        <Body surface="light" weight="semibold" size={13}>
          Reviews
        </Body>
        <Mono surface="light" tone="muted" size={10}>
          {meta}
        </Mono>
      </View>
      <View style={styles.bars}>
        {bars.map((v, i) => {
          const isLast = i === bars.length - 1;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                { height: `${Math.max(6, Math.min(100, v * 100))}%` },
                isLast && styles.barToday,
              ]}
            />
          );
        })}
      </View>
      <View style={styles.barAxis}>
        {labels.map((l, i) => (
          <Mono
            key={i}
            surface="light"
            tone={i === labels.length - 1 ? 'brand' : 'faint'}
            size={8}
            style={styles.barAxisLabel}
          >
            {l}
          </Mono>
        ))}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Lifetime activity (monthly bars)
// ---------------------------------------------------------------------------

function LifetimeBars({ style }: { style?: object }) {
  return (
    <Card padded radius={12} style={style}>
      <View style={styles.detTop}>
        <Body surface="light" weight="semibold" size={13}>
          Activity
        </Body>
        <Mono surface="light" tone="muted" size={10}>
          by month
        </Mono>
      </View>
      <View style={styles.lifeRow}>
        {REVIEWS.lifetime.bars.map((v, i) => {
          const isLast = i === REVIEWS.lifetime.bars.length - 1;
          return (
            <View
              key={i}
              style={[
                styles.lifeBar,
                { height: `${Math.max(5, Math.min(100, v * 100))}%` },
                isLast && styles.lifeBarCurrent,
              ]}
            />
          );
        })}
      </View>
      <View style={styles.barAxis}>
        {REVIEWS.lifetime.labels.map((l, i) => (
          <Mono
            key={i}
            surface="light"
            tone={i === REVIEWS.lifetime.labels.length - 1 ? 'brand' : 'faint'}
            size={8}
            style={styles.barAxisLabel}
          >
            {l}
          </Mono>
        ))}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Personal-bests row
// ---------------------------------------------------------------------------

function BestRow({ best, last }: { best: Best; last: boolean }) {
  return (
    <View
      style={[styles.bestRow, best.current && styles.bestRowCurrent, last && styles.bestRowLast]}
    >
      <Mono surface="light" tone="faint" size={10} style={styles.bestRank}>
        {best.rank}
      </Mono>
      <View style={styles.bestMid}>
        <View style={styles.bestDaysRow}>
          <Num surface="light" size={20}>
            {best.days}
          </Num>
          <Body surface="light" tone="muted" size={11}>
            days
          </Body>
        </View>
        {best.current && (
          <Mono surface="light" tone="brand" size={9}>
            current
          </Mono>
        )}
      </View>
      <Mono surface="light" tone="muted" size={10}>
        {best.dates}
      </Mono>
    </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  // Nav
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  navBtn: {
    width: 40,
  },
  navBtnRight: {
    alignItems: 'flex-end',
  },
  // Hero
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  heroCol: {
    flex: 1,
    gap: 4,
  },
  heroLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.paperSoft,
    borderRadius: 9,
    padding: 3,
    marginBottom: 12,
  },
  seg: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 7,
    alignItems: 'center',
  },
  segOn: {
    backgroundColor: colors.paper,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segText: {
    textTransform: 'capitalize',
  },
  // Stat grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statTile: {
    width: '48.5%',
  },
  section: {
    marginBottom: 12,
  },
  // Det section header
  detTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  // Reviews bars
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 50,
  },
  bar: {
    flex: 1,
    backgroundColor: colors.brandFill,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    minHeight: 3,
    opacity: 0.9,
  },
  barToday: {
    backgroundColor: colors.brand,
    opacity: 1,
  },
  barAxis: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  barAxisLabel: {
    flex: 1,
    textAlign: 'center',
  },
  // Lifetime bars
  lifeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 80,
  },
  lifeBar: {
    flex: 1,
    backgroundColor: colors.brandFill,
    opacity: 0.85,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 4,
  },
  lifeBarCurrent: {
    backgroundColor: colors.brand,
    opacity: 1,
  },
  // Bests
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  bestRowCurrent: {
    backgroundColor: colors.brandTint,
  },
  bestRowLast: {
    borderBottomWidth: 0,
  },
  bestRank: {
    width: 18,
  },
  bestMid: {
    gap: 1,
  },
  bestDaysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
});
