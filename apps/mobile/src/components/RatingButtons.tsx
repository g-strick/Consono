/**
 * RatingButtons — 4-column FSRS rating button row with semantic v6 styling.
 *
 * Semantic colors per wireframe (.rate-row):
 *   again — border/label: colors.again (red)
 *   hard  — border: colors.hard (gold), label: colors.accentDeep (dark gold)
 *   good  — border/label: colors.good (brandFill cobalt), bg: colors.brandTint
 *   easy  — border: colors.easy (brandSoft blue), label: colors.brandSoft
 *
 * Usage:
 *   <RatingButtons onRate={(r) => handleRate(r)} />
 *   <RatingButtons intervals={{ again: '<1m', hard: '6m', good: '10m', easy: '4d' }} onRate={...} />
 */
import { View, Text, Pressable, ViewStyle, TextStyle } from 'react-native';
import { colors, fonts } from '@/src/lib/theme';
import { type Rating } from '@/src/lib/api';

interface RatingButtonsProps {
  /**
   * Map of rating → display interval string shown below the label.
   * Defaults to visual-fidelity placeholders when not provided.
   */
  intervals?: Record<Rating, string>;
  /** Called when the user taps a rating button. */
  onRate: (rating: Rating) => void;
}

type RatingConfig = {
  label: string;
  borderColor: string;
  labelColor: string;
  bgColor: string;
};

const RATING_CONFIGS: Record<Rating, RatingConfig> = {
  again: {
    label: 'Again',
    borderColor: colors.again,
    labelColor: colors.again,
    bgColor: colors.paper,
  },
  hard: {
    label: 'Hard',
    borderColor: colors.hard,
    labelColor: colors.accentDeep,
    bgColor: colors.paper,
  },
  good: {
    label: 'Good',
    borderColor: colors.good,
    labelColor: colors.good,
    bgColor: colors.brandTint,
  },
  easy: {
    label: 'Easy',
    borderColor: colors.easy,
    labelColor: colors.brandSoft,
    bgColor: colors.paper,
  },
};

const DEFAULT_INTERVALS: Record<Rating, string> = {
  again: '<1m',
  hard: '6m',
  good: '10m',
  easy: '4d',
};

const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];

export function RatingButtons({ intervals, onRate }: RatingButtonsProps) {
  const displayIntervals = intervals ?? DEFAULT_INTERVALS;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 6,
      }}
    >
      {RATINGS.map((rating) => {
        const cfg = RATING_CONFIGS[rating];
        const interval = displayIntervals[rating];

        const tileStyle: ViewStyle = {
          flex: 1,
          borderRadius: 10,
          paddingVertical: 9,
          paddingHorizontal: 4,
          alignItems: 'center',
          borderWidth: 0.5,
          borderColor: cfg.borderColor,
          backgroundColor: cfg.bgColor,
        };

        const labelStyle: TextStyle = {
          fontFamily: fonts.uiSemibold,
          fontSize: 12,
          color: cfg.labelColor,
          lineHeight: 16,
        };

        const intervalStyle: TextStyle = {
          fontFamily: fonts.monoMedium,
          fontSize: 9.5,
          color: 'rgba(0,0,0,0.60)',
          marginTop: 2,
          lineHeight: 13,
        };

        return (
          <Pressable key={rating} style={tileStyle} onPress={() => onRate(rating)}>
            <Text style={labelStyle}>{cfg.label}</Text>
            <Text style={intervalStyle}>{interval}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
