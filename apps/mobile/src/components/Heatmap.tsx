/**
 * Heatmap.tsx — Activity heatmaps for the v6 streak detail screen.
 *
 * Exports:
 *   YearHeatmap  — 53w × 7d GitHub-style grid (fills column-by-column) with the
 *                  4-stop heat ramp, today outlined (not filled), a "less ▢▢▢▢ more"
 *                  ramp legend in the section header, and a month axis underneath.
 *   MonthHeatmap — 7-column calendar grid with a M T W T F S S header, leading
 *                  empty days transparent, today outlined.
 *
 * Intensity is an integer 0–3 mapped to colors.heat0..heat3. All colors come
 * from theme tokens — no inline heat hex (V6-06 / DSGN spec).
 *
 * Usage:
 *   <YearHeatmap levels={levels} todayIndex={370} monthLabels={['jun', …]} />
 *   <MonthHeatmap days={[null, null, 0, 1, 3, …]} todayIndex={20} monthLabel="may" />
 */
import { View, ViewStyle } from 'react-native';
import { colors } from '@/src/lib/theme';
import { Body, Mono } from '@/src/components/Type';
import { Card } from '@/src/components/Surface';

const HEAT = [colors.heat0, colors.heat1, colors.heat2, colors.heat3] as const;

/** Clamp an intensity to the 0–3 ramp and return its heat token. */
function heatColor(level: number): string {
  const i = Math.max(0, Math.min(3, Math.round(level)));
  return HEAT[i];
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** Section header: bold title on the left, optional ramp/meta on the right. */
function DetSection({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={detStyles.top}>
      <Body surface="light" weight="semibold" size={13}>
        {title}
      </Body>
      {right}
    </View>
  );
}

/** "less ▢▢▢▢ more" ramp legend using the four heat tokens. */
function RampLegend() {
  return (
    <View style={detStyles.ramp}>
      <Mono surface="light" tone="muted" size={9} style={detStyles.rampWord}>
        less
      </Mono>
      {HEAT.map((c, i) => (
        <View key={i} style={[detStyles.sw, { backgroundColor: c }]} />
      ))}
      <Mono surface="light" tone="muted" size={9} style={detStyles.rampWord}>
        more
      </Mono>
    </View>
  );
}

// ---------------------------------------------------------------------------
// YearHeatmap — 53 week columns × 7 day rows
// ---------------------------------------------------------------------------

interface YearHeatmapProps {
  /** Intensity 0–3 per day, ordered column-by-column (up to 53×7 = 371). */
  levels: number[];
  /** Flat index of today's cell; rendered transparent with a 1px brand outline. */
  todayIndex?: number;
  /** Month tick labels for the bottom axis (sparse strings, flex-spaced). */
  monthLabels?: string[];
  /** Section title; defaults to "Activity". */
  title?: string;
  style?: ViewStyle;
}

export function YearHeatmap({
  levels,
  todayIndex,
  monthLabels = [],
  title = 'Activity',
  style,
}: YearHeatmapProps) {
  // Chunk the flat day array into 53 columns of 7 (week = column).
  const columns: { level: number; index: number }[][] = [];
  for (let c = 0; c < 53; c++) {
    const col: { level: number; index: number }[] = [];
    for (let r = 0; r < 7; r++) {
      const index = c * 7 + r;
      col.push({ level: levels[index] ?? 0, index });
    }
    columns.push(col);
  }

  return (
    <Card padded radius={12} style={style}>
      <DetSection title={title} right={<RampLegend />} />

      <View style={yearStyles.grid}>
        {columns.map((col, c) => (
          <View key={c} style={yearStyles.column}>
            {col.map((cell) => {
              const isToday = cell.index === todayIndex;
              return (
                <View
                  key={cell.index}
                  style={[
                    yearStyles.cell,
                    isToday
                      ? {
                          backgroundColor: 'transparent',
                          borderWidth: 1,
                          borderColor: colors.brand,
                        }
                      : { backgroundColor: heatColor(cell.level) },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      {monthLabels.length > 0 && (
        <View style={yearStyles.months}>
          {monthLabels.map((m, i) => (
            <Mono key={i} surface="light" tone="faint" size={8.5} style={yearStyles.monthLabel}>
              {m}
            </Mono>
          ))}
        </View>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// MonthHeatmap — 7-column calendar grid
// ---------------------------------------------------------------------------

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

interface MonthHeatmapProps {
  /** Intensity 0–3 per calendar slot; `null` = empty leading/trailing day. */
  days: (number | null)[];
  /** Flat index of today's day; rendered transparent with a 1.5px brand outline. */
  todayIndex?: number;
  /** Section title; defaults to "Activity". */
  monthLabel?: string;
  style?: ViewStyle;
}

export function MonthHeatmap({
  days,
  todayIndex,
  monthLabel = 'Activity',
  style,
}: MonthHeatmapProps) {
  // Chunk into rows of 7 (calendar weeks).
  const weeks: { value: number | null; index: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7).map((value, j) => ({ value, index: i + j })));
  }

  return (
    <Card padded radius={12} style={style}>
      <DetSection title={monthLabel} />

      <View style={monthStyles.dow}>
        {DOW.map((d, i) => (
          <Mono key={i} surface="light" tone="faint" size={8.5} style={monthStyles.dowCell}>
            {d}
          </Mono>
        ))}
      </View>

      <View style={monthStyles.days}>
        {weeks.map((week, w) => (
          <View key={w} style={monthStyles.week}>
            {week.map((cell) => {
              const isToday = cell.index === todayIndex;
              const isEmpty = cell.value === null;
              return (
                <View
                  key={cell.index}
                  style={[
                    monthStyles.day,
                    isEmpty
                      ? { backgroundColor: 'transparent' }
                      : isToday
                        ? {
                            backgroundColor: 'transparent',
                            borderWidth: 1.5,
                            borderColor: colors.brand,
                          }
                        : { backgroundColor: heatColor(cell.value as number) },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

import { StyleSheet } from 'react-native';

const detStyles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ramp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rampWord: {
    letterSpacing: 0.06 * 9,
  },
  sw: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
});

const yearStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 2,
  },
  column: {
    flex: 1,
    gap: 2,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: 1.5,
  },
  months: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 6,
  },
  monthLabel: {
    flex: 1,
  },
});

const monthStyles = StyleSheet.create({
  dow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 4,
  },
  dowCell: {
    flex: 1,
    textAlign: 'center',
  },
  days: {
    gap: 3,
  },
  week: {
    flexDirection: 'row',
    gap: 3,
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 3,
  },
});
