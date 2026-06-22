/**
 * RatingDistribution.tsx — Stacked rating-distribution bar for the streak detail.
 *
 * Renders a 14px stacked horizontal bar split into again / hard / good / easy
 * segments (sized by percentage, semantic colors) plus a 4-column legend with a
 * swatch, an uppercase Mono name, and a bold percentage. Wrapped in a paper Card
 * with a section header (title + "{total} reviews" meta).
 *
 * Accepts either raw `counts` or pre-computed `percents`. Zero-state renders an
 * empty bar and 0% legend. All colors come from theme tokens (DSGN spec).
 *
 * Usage:
 *   <RatingDistribution percents={{ again: 8, hard: 18, good: 56, easy: 18 }} total={1247} />
 *   <RatingDistribution counts={{ again: 12, hard: 30, good: 90, easy: 28 }} />
 */
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/src/lib/theme';
import { Body, Mono } from '@/src/components/Type';
import { Card } from '@/src/components/Surface';

type Rating = 'again' | 'hard' | 'good' | 'easy';

const ORDER: Rating[] = ['again', 'hard', 'good', 'easy'];
const RATING_COLOR: Record<Rating, string> = {
  again: colors.again,
  hard: colors.hard,
  good: colors.good,
  easy: colors.easy,
};

type RatingValues = Record<Rating, number>;

interface RatingDistributionProps {
  /** Raw review counts per rating; percentages are derived from the sum. */
  counts?: RatingValues;
  /** Pre-computed percentages (0–100) per rating. */
  percents?: RatingValues;
  /** Total reviews shown in the section meta; defaults to the counts sum. */
  total?: number;
  /** Section title; defaults to "Rating distribution". */
  title?: string;
  style?: ViewStyle;
}

/** Resolve the four percentages and total from whichever input was given. */
function resolve(
  counts?: RatingValues,
  percents?: RatingValues,
  total?: number,
): { percents: RatingValues; total: number } {
  if (percents) {
    const sum = total ?? ORDER.reduce((acc, r) => acc + percents[r], 0);
    return { percents, total: sum };
  }
  if (counts) {
    const sum = ORDER.reduce((acc, r) => acc + counts[r], 0);
    const pct = (n: number) => (sum > 0 ? (n / sum) * 100 : 0);
    return {
      percents: {
        again: pct(counts.again),
        hard: pct(counts.hard),
        good: pct(counts.good),
        easy: pct(counts.easy),
      },
      total: total ?? sum,
    };
  }
  return { percents: { again: 0, hard: 0, good: 0, easy: 0 }, total: total ?? 0 };
}

/** Format a percentage to a whole-number string with a trailing %. */
function fmtPct(p: number): string {
  return `${Math.round(p)}%`;
}

export function RatingDistribution({
  counts,
  percents,
  total,
  title = 'Rating distribution',
  style,
}: RatingDistributionProps) {
  const { percents: pct, total: totalReviews } = resolve(counts, percents, total);
  const isEmpty = totalReviews === 0;

  return (
    <Card padded radius={12} style={style}>
      <View style={styles.top}>
        <Body surface="light" weight="semibold" size={13}>
          {title}
        </Body>
        <Mono surface="light" tone="muted" size={10}>
          {totalReviews.toLocaleString()} reviews
        </Mono>
      </View>

      {/* Stacked bar */}
      <View style={styles.bar}>
        {isEmpty ? (
          <View style={[styles.segment, { flex: 1, backgroundColor: colors.paperSoft2 }]} />
        ) : (
          ORDER.map((r) => {
            const w = pct[r];
            if (w <= 0) return null;
            return (
              <View
                key={r}
                style={[styles.segment, { flex: w, backgroundColor: RATING_COLOR[r] }]}
              />
            );
          })
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {ORDER.map((r) => (
          <View key={r} style={styles.item}>
            <View style={styles.name}>
              <View style={[styles.swatch, { backgroundColor: RATING_COLOR[r] }]} />
              <Mono surface="light" tone="muted" size={9} style={styles.nameText}>
                {r}
              </Mono>
            </View>
            <Mono surface="light" tone="primary" size={13} style={styles.pct}>
              {fmtPct(pct[r])}
            </Mono>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bar: {
    height: 14,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  segment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  item: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  name: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nameText: {
    letterSpacing: 0.06 * 9,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  pct: {
    letterSpacing: 0,
    textTransform: 'none',
  },
});
