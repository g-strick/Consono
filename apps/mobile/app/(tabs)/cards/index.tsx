import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type AllCard } from '@/src/lib/api';
import { filterCards, type ActiveFilters } from '@/src/lib/cardUtils';
import { colors, fonts, textColors } from '@/src/lib/theme';
import { SwipeableRow } from '@/src/components/SwipeableRow';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: ActiveFilters = { gender: [], source_tag: [], register: [], srs_state: [] };

const GENDER_CHIPS = ['Masculine', 'Feminine', 'Common'] as const;
const REGISTER_CHIPS = ['Formal', 'Informal', 'Slang', 'Neutral'] as const;
const SRS_STATE_CHIPS = ['New', 'Learning', 'Review', 'Relearning', 'Suspended'] as const;
const CANONICAL_SOURCE_CHIPS = ['WhatsApp', 'Instagram', 'Netflix'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stateColor(state: AllCard['state']): string {
  if (state === 'new') return textColors.light.brand;
  if (state === 'learning' || state === 'relearning') return '#F0BF38';
  return '#22C55E';
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// ─── Filter chip bar ─────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function FilterChip({ label, active, onPress }: FilterChipProps) {
  if (active) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: '#1F3494',
          borderWidth: 1,
          borderColor: '#142468',
        }}
      >
        <Text style={{ fontFamily: fonts.uiSemibold, fontSize: 12, color: '#FFFFFF' }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: colors.paperSoft,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
      }}
    >
      <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: '#000000' }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Card row ────────────────────────────────────────────────────────────────

function CardRow({ card }: { card: AllCard }) {
  const genderColor =
    card.gender === 'feminine'
      ? colors.genderFem
      : card.gender === 'masculine'
        ? colors.genderMasc
        : '#C99A1F';

  const isSuspended = card.suspended_at != null;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: '#F0F0F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.paper,
      }}
    >
      {card.gender && (
        <View style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: genderColor }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.uiSemibold, fontSize: 15, color: '#000000' }}>
          {card.headword ?? card.sentence_pt}
        </Text>
        {card.gendered_form ? (
          <Text
            style={{ fontFamily: fonts.ui, fontSize: 12, color: 'rgba(0,0,0,0.50)', marginTop: 2 }}
          >
            {card.gendered_form}
          </Text>
        ) : null}
      </View>

      {/* Badge: Suspended overrides SRS state */}
      {isSuspended ? (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: 'rgba(0,0,0,0.40)' }}>
            Suspended
          </Text>
        </View>
      ) : (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: stateColor(card.state) + '20',
          }}
        >
          <Text
            style={{
              fontFamily: fonts.ui,
              fontSize: 11,
              color: stateColor(card.state),
              textTransform: 'capitalize',
            }}
          >
            {card.state}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CardsScreen() {
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, isRefetching } = useQuery({
    queryKey: ['cards', 'all'],
    queryFn: () => api.getAllCards(),
  });

  const allCards = data?.cards ?? [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['cards'] });
    queryClient.invalidateQueries({ queryKey: ['home', 'summary'] });
  };

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspend }: { id: number; suspend: boolean }) => api.suspendCard(id, suspend),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCard(id),
    onSuccess: invalidateAll,
  });

  function confirmDelete(card: AllCard) {
    Alert.alert(
      'Delete card?',
      `This will permanently remove "${card.headword ?? 'this card'}" and its review history.`,
      [
        { text: 'Keep card', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(card.id) },
      ],
    );
  }

  // Collect distinct custom source tags from card data
  const customSourceTags = [
    ...new Set(
      allCards
        .map((c) => c.source_tag)
        .filter(
          (t): t is string =>
            t != null &&
            !CANONICAL_SOURCE_CHIPS.map((s) => s.toLowerCase()).includes(t.toLowerCase()),
        ),
    ),
  ];

  const visible = filterCards(allCards, filters);
  const hasActiveFilters =
    filters.gender.length > 0 ||
    filters.source_tag.length > 0 ||
    filters.register.length > 0 ||
    filters.srs_state.length > 0;

  function onRefresh() {
    queryClient.invalidateQueries({ queryKey: ['cards', 'all'] });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontFamily: fonts.uiBold, fontSize: 24, color: '#000000' }}>Cards</Text>
        <Text
          style={{ fontFamily: fonts.ui, fontSize: 13, color: 'rgba(0,0,0,0.50)', marginTop: 2 }}
        >
          {allCards.length} cards
        </Text>
      </View>

      {/* Filter chip bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 8,
          gap: 8,
          flexDirection: 'row',
        }}
      >
        {/* Gender chips */}
        {GENDER_CHIPS.map((label) => {
          const value = label.toLowerCase() as ActiveFilters['gender'][number];
          const active = filters.gender.includes(value);
          return (
            <FilterChip
              key={label}
              label={label}
              active={active}
              onPress={() => setFilters((f) => ({ ...f, gender: toggle(f.gender, value) }))}
            />
          );
        })}

        {/* Source tag chips */}
        {CANONICAL_SOURCE_CHIPS.map((label) => {
          const value = label.toLowerCase();
          const active = filters.source_tag.includes(value);
          return (
            <FilterChip
              key={label}
              label={label}
              active={active}
              onPress={() => setFilters((f) => ({ ...f, source_tag: toggle(f.source_tag, value) }))}
            />
          );
        })}
        {customSourceTags.map((tag) => {
          const active = filters.source_tag.includes(tag);
          return (
            <FilterChip
              key={tag}
              label={tag}
              active={active}
              onPress={() => setFilters((f) => ({ ...f, source_tag: toggle(f.source_tag, tag) }))}
            />
          );
        })}

        {/* Register chips */}
        {REGISTER_CHIPS.map((label) => {
          const value = label.toLowerCase() as ActiveFilters['register'][number];
          const active = filters.register.includes(value);
          return (
            <FilterChip
              key={label}
              label={label}
              active={active}
              onPress={() => setFilters((f) => ({ ...f, register: toggle(f.register, value) }))}
            />
          );
        })}

        {/* SRS state chips */}
        {SRS_STATE_CHIPS.map((label) => {
          const value = label.toLowerCase() as ActiveFilters['srs_state'][number];
          const active = filters.srs_state.includes(value);
          return (
            <FilterChip
              key={label}
              label={label}
              active={active}
              onPress={() => setFilters((f) => ({ ...f, srs_state: toggle(f.srs_state, value) }))}
            />
          );
        })}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : isError ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          <Text
            style={{
              fontFamily: fonts.uiSemibold,
              fontSize: 17,
              color: '#000000',
              textAlign: 'center',
            }}
          >
            Could not load cards.
          </Text>
          <Text
            style={{
              fontFamily: fonts.ui,
              fontSize: 15,
              color: 'rgba(0,0,0,0.50)',
              textAlign: 'center',
              marginTop: 6,
            }}
          >
            Pull to refresh.
          </Text>
        </View>
      ) : allCards.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          <Text
            style={{
              fontFamily: fonts.uiSemibold,
              fontSize: 17,
              color: '#000000',
              textAlign: 'center',
            }}
          >
            No cards yet.
          </Text>
          <Text
            style={{
              fontFamily: fonts.ui,
              fontSize: 15,
              color: 'rgba(0,0,0,0.50)',
              textAlign: 'center',
              marginTop: 6,
            }}
          >
            Add a word to get started.
          </Text>
        </View>
      ) : visible.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
        >
          <Text
            style={{
              fontFamily: fonts.uiSemibold,
              fontSize: 17,
              color: '#000000',
              textAlign: 'center',
            }}
          >
            No cards match.
          </Text>
          <Text
            style={{
              fontFamily: fonts.ui,
              fontSize: 15,
              color: 'rgba(0,0,0,0.50)',
              textAlign: 'center',
              marginTop: 6,
            }}
          >
            Try removing some filters.
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity onPress={() => setFilters(EMPTY_FILTERS)} style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: fonts.uiSemibold, fontSize: 14, color: colors.brand }}>
                Clear filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
          renderItem={({ item }) => (
            <SwipeableRow
              isSuspended={item.suspended_at != null}
              onSuspend={() =>
                suspendMutation.mutate({ id: item.id, suspend: item.suspended_at == null })
              }
              onDelete={() => confirmDelete(item)}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/cards/[id]', params: { id: item.id } })}
              >
                <CardRow card={item} />
              </TouchableOpacity>
            </SwipeableRow>
          )}
        />
      )}
    </SafeAreaView>
  );
}
