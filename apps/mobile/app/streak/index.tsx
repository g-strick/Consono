/**
 * streak/index.tsx — v6 Streak detail screen (§4).
 *
 * Layout: detail-nav → compact hero (flame + cobalt streak number + mono caps
 * line) → period toggle (month / year / lifetime, default year) → 2×2 stat grid
 * → period-scoped activity (year heatmap / month calendar / lifetime bars) →
 * reviews bar chart → rating distribution → personal bests.
 *
 * Wired to real getStreakStats() data (Phase 3, Plan 03-03).
 * All three periods arrive in one payload; the toggle is instant (no refetch).
 * Zeros render while loading — no skeleton or error UI (UI-SPEC Data States).
 */
import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/src/lib/theme';
import { Body, Mono, Num } from '@/src/components/Type';
import { StatTile } from '@/src/components/StatTile';
import { Card } from '@/src/components/Surface';
import { YearHeatmap, MonthHeatmap } from '@/src/components/Heatmap';
import { RatingDistribution } from '@/src/components/RatingDistribution';
import { api } from '@/src/lib/api';
import type { StreakStats } from '@/src/lib/api';

type Period = 'month' | 'year' | 'lifetime';

const MONTH_ABBR = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

/** Format 'YYYY-MM-DD' → 'mmm d' (e.g. '2024-01-04' → 'jan 4'). */
function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${MONTH_ABBR[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

/** Format 'YYYY-MM-DD' → 'mmm yyyy' (e.g. '2025-01-04' → 'jan 2025'). */
function fmtMonthYear(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  return `${MONTH_ABBR[parseInt(m, 10) - 1]} ${y}`;
}

/** Format a local Date as 'YYYY-MM-DD' key (avoids UTC offset issues). */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Best {
  rank: string;
  days: number;
  dates: string;
  current?: boolean;
}

function buildBests(bests: StreakStats['bests'] | undefined): Best[] {
  if (!bests || bests.length === 0) {
    return [{ rank: '→', days: 0, dates: 'today', current: true }];
  }
  return bests.map((b) => ({
    rank: b.current ? '→' : String(b.rank),
    days: b.days,
    dates:
      b.days === 0
        ? 'today'
        : b.current
          ? `${fmtDate(b.startDate)} – today`
          : `${fmtDate(b.startDate)} – ${fmtDate(b.endDate)}`,
    current: b.current,
  }));
}

// ===========================================================================

export default function StreakScreen() {
  const [period, setPeriod] = useState<Period>('year');

  const { data: streakStats } = useQuery({
    queryKey: ['streak', 'stats'],
    queryFn: () => api.getStreakStats(),
    staleTime: 1000 * 30,
  });

  const today = new Date();
  const hero = streakStats?.hero ?? { streak: 0, longestAllTime: 0, retentionAllTime: 0 };

  const mo = streakStats?.month;
  const yr = streakStats?.year;
  const lt = streakStats?.lifetime;

  // --- Stat tiles (2×2 grid, period-scoped, D-07/D-08/D-09) ---
  const stats: { value: string; label: string; sub: string }[] =
    period === 'month'
      ? [
          { value: String(mo?.longestStreak ?? 0), label: 'longest', sub: 'this month' },
          { value: `${mo?.retention ?? 0}%`, label: 'retention', sub: 'this month' },
          { value: (mo?.totalReviews ?? 0).toLocaleString(), label: 'reviews', sub: 'this month' },
          {
            value: String(mo?.daysActive ?? 0),
            label: 'days active',
            sub: `of ${mo?.daysInMonth ?? 31}`,
          },
        ]
      : period === 'year'
        ? [
            {
              value: String(yr?.longestStreak ?? 0),
              label: 'longest',
              sub: yr?.longestDates ?? '—',
            },
            { value: `${yr?.retention ?? 0}%`, label: 'retention', sub: 'past year' },
            { value: (yr?.totalReviews ?? 0).toLocaleString(), label: 'reviews', sub: 'past year' },
            { value: String(yr?.daysActive ?? 0), label: 'days active', sub: 'past year' },
          ]
        : [
            { value: String(lt?.longestStreak ?? 0), label: 'longest', sub: 'all time' },
            { value: `${lt?.retention ?? 0}%`, label: 'retention', sub: 'all time' },
            { value: (lt?.totalReviews ?? 0).toLocaleString(), label: 'reviews', sub: 'all time' },
            {
              value: String(lt?.daysActive ?? 0),
              label: 'days active',
              sub: lt?.firstReviewDate ? `since ${fmtMonthYear(lt.firstReviewDate)}` : 'all time',
            },
          ];

  // --- Year heatmap (371 cells column-major, today = index 370) ---
  const yearHeatLevels = yr?.heatLevels ?? {};
  const yearLevels: number[] = [];
  for (let i = 370; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    yearLevels.push(yearHeatLevels[toDateKey(d)] ?? 0);
  }

  // 26-slot sparse month-name axis (≈ 1 label per 2 columns = ~14 days)
  const yearMonthLabels: string[] = [];
  {
    let lastMonth = -1;
    for (let slot = 0; slot < 26; slot++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (370 - slot * 14));
      const mn = d.getMonth();
      if (mn !== lastMonth) {
        yearMonthLabels.push(MONTH_ABBR[mn]);
        lastMonth = mn;
      } else {
        yearMonthLabels.push('');
      }
    }
  }

  // --- Month heatmap (calendar grid, Monday-first leading nulls) ---
  const monthHeatLevels = mo?.heatLevels ?? {};
  const daysInMonth = mo?.daysInMonth ?? 31;
  const firstDow = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const leadingNulls = firstDow === 0 ? 6 : firstDow - 1;
  const monthDays: (number | null)[] = Array(leadingNulls).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    monthDays.push(monthHeatLevels[key] ?? 0);
  }
  const monthTodayIndex = leadingNulls + today.getDate() - 1;
  const monthLabelStr = `${MONTH_ABBR[today.getMonth()]} ${today.getFullYear()}`;

  // --- Reviews chart bars + labels (period-scoped) ---
  let reviewBars: number[] = [];
  let reviewLabels: string[] = [];

  if (period === 'year') {
    const perMonth = yr?.perMonth ?? [];
    const max = Math.max(...perMonth.map((e) => e.count), 1);
    reviewBars = perMonth.map((e) => e.count / max);
    reviewLabels = perMonth.map((e) => e.label.slice(0, 1).toUpperCase());
  } else if (period === 'month') {
    const perDay = mo?.perDay ?? {};
    const counts: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      counts.push(perDay[key] ?? 0);
    }
    const max = Math.max(...counts, 1);
    reviewBars = counts.map((c) => c / max);
    reviewLabels = counts.map((_, i) => ([1, 8, 15, 22, 29].includes(i + 1) ? String(i + 1) : ''));
  } else {
    const perMonth = lt?.perMonth ?? [];
    const max = Math.max(...perMonth.map((e) => e.count), 1);
    const step = Math.max(1, Math.floor(perMonth.length / 4));
    reviewBars = perMonth.map((e) => e.count / max);
    reviewLabels = perMonth.map((e, i) =>
      i === perMonth.length - 1 ? 'now' : i % step === 0 ? e.label : '',
    );
  }

  // --- Lifetime bars (all months) ---
  const ltPerMonth = lt?.perMonth ?? [];
  const ltMax = Math.max(...ltPerMonth.map((e) => e.count), 1);
  const lifetimeBars = ltPerMonth.map((e) => e.count / ltMax);
  const ltStep = Math.max(1, Math.floor(ltPerMonth.length / 4));
  const lifetimeLabels = ltPerMonth.map((e, i) =>
    i === ltPerMonth.length - 1 ? 'now' : i % ltStep === 0 ? e.label : '',
  );

  // --- Rating distribution (period-scoped) ---
  const ratingCounts =
    period === 'month'
      ? (mo?.ratingCounts ?? { again: 0, hard: 0, good: 0, easy: 0 })
      : period === 'year'
        ? (yr?.ratingCounts ?? { again: 0, hard: 0, good: 0, easy: 0 })
        : (lt?.ratingCounts ?? { again: 0, hard: 0, good: 0, easy: 0 });

  // --- Personal bests ---
  const bests = buildBests(streakStats?.bests);

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
              {hero.streak}
            </Num>
            <View style={styles.heroLine}>
              <Mono surface="light" tone="muted" size={10}>
                day streak
              </Mono>
              <Mono surface="light" tone="faint" size={10}>
                ·
              </Mono>
              <Mono surface="light" tone="muted" size={10}>
                longest {hero.longestAllTime}
              </Mono>
              <Mono surface="light" tone="faint" size={10}>
                ·
              </Mono>
              <Mono surface="light" tone="muted" size={10}>
                retention {hero.retentionAllTime}%
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
          {stats.map((s) => (
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
            levels={yearLevels}
            todayIndex={370}
            monthLabels={yearMonthLabels}
            style={styles.section}
          />
        ) : period === 'month' ? (
          <MonthHeatmap
            days={monthDays}
            todayIndex={monthTodayIndex}
            monthLabel={monthLabelStr}
            style={styles.section}
          />
        ) : (
          <LifetimeBars bars={lifetimeBars} labels={lifetimeLabels} style={styles.section} />
        )}

        {/* Reviews bar chart */}
        <ReviewsChart
          period={period}
          bars={reviewBars}
          labels={reviewLabels}
          style={styles.section}
        />

        {/* Rating distribution */}
        <RatingDistribution counts={ratingCounts} style={styles.section} />

        {/* Personal bests */}
        <Card radius={12} style={styles.section}>
          {bests.map((b, i) => (
            <BestRow key={b.rank} best={b} last={i === bests.length - 1} />
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

function LifetimeBars({
  bars,
  labels,
  style,
}: {
  bars: number[];
  labels: string[];
  style?: object;
}) {
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
        {bars.map((v, i) => {
          const isLast = i === bars.length - 1;
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
