import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, fonts } from '@/src/lib/theme';
import { Body, Display, Mono } from '@/src/components/Type';
import { StatTile } from '@/src/components/StatTile';
import { Chip } from '@/src/components/Chip';
import { api } from '@/src/lib/api';
import { formatDueAt, formatLastReviewed } from '@/src/lib/cardUtils';

const CANONICAL_SOURCES = ['whatsapp', 'instagram', 'netflix'] as const;
type CanonicalSource = (typeof CANONICAL_SOURCES)[number];

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = parseInt(id, 10);

  const queryClient = useQueryClient();
  const [editingSentence, setEditingSentence] = useState(false);
  const [sentenceDraft, setSentenceDraft] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['cards', cardId],
    queryFn: () => api.getCard(cardId),
    enabled: !isNaN(cardId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['cards'] });
    queryClient.invalidateQueries({ queryKey: ['home', 'summary'] });
  };

  const updateMutation = useMutation({
    mutationFn: (patch: { sentence_pt?: string; source_tag?: string | null }) =>
      api.updateCard(cardId, patch),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['cards', cardId] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (suspend: boolean) => api.suspendCard(cardId, suspend),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCard(cardId),
    onSuccess: () => {
      invalidateAll();
      router.back();
    },
  });

  if (isNaN(cardId)) return null;

  if (isLoading || !data?.card) {
    return (
      <SafeAreaView style={styles.root}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Body tone="brand">← Card detail</Body>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const card = data.card;
  const isSuspended = card.suspended_at != null;

  const genderColor =
    card.gender === 'feminine'
      ? colors.genderFem
      : card.gender === 'masculine'
        ? colors.genderMasc
        : colors.genderCommon;

  const stateValue = isSuspended ? 'Suspended' : card.state;

  const stats = [
    {
      label: 'STABILITY',
      value: card.stability != null ? `${Math.round(card.stability)} days` : '—',
    },
    {
      label: 'DIFFICULTY',
      value: card.difficulty != null ? String(Math.round(card.difficulty)) : '—',
    },
    { label: 'SRS STATE', value: stateValue },
    { label: 'DUE', value: formatDueAt(card.due_at) },
    { label: 'REVIEWS', value: String(card.reps) },
    { label: 'LAST REVIEWED', value: formatLastReviewed(card.last_reviewed_at) },
  ];

  function handleSaveSentence() {
    const trimmed = sentenceDraft.trim();
    if (trimmed && trimmed !== card.sentence_pt) {
      updateMutation.mutate({ sentence_pt: trimmed });
    }
    setEditingSentence(false);
  }

  function handleSourceTap(src: string) {
    const newTag = card.source_tag === src ? null : src;
    updateMutation.mutate({ source_tag: newTag });
  }

  function handleCustomSource() {
    const currentCustom =
      card.source_tag && !CANONICAL_SOURCES.includes(card.source_tag as CanonicalSource)
        ? card.source_tag
        : '';
    Alert.prompt(
      'Custom source',
      'e.g. livro, aula…',
      (text) => {
        if (text && text.trim()) updateMutation.mutate({ source_tag: text.trim() });
      },
      'plain-text',
      currentCustom,
    );
  }

  function confirmDelete() {
    Alert.alert(
      'Delete card?',
      `This will permanently remove "${card.headword ?? 'this card'}" and its review history.`,
      [
        { text: 'Keep card', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ],
    );
  }

  const hasCustomSource =
    card.source_tag != null && !CANONICAL_SOURCES.includes(card.source_tag as CanonicalSource);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Back nav */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Body tone="brand" weight="medium">
            ← Card detail
          </Body>
        </TouchableOpacity>

        {/* Image */}
        {card.image_url ? (
          <Image source={{ uri: card.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Body tone="muted">No image</Body>
          </View>
        )}

        {/* Word header */}
        <View style={styles.wordHeader}>
          {card.gender && <View style={[styles.genderRail, { backgroundColor: genderColor }]} />}
          <View style={{ flex: 1 }}>
            <Display size={30}>{card.headword ?? card.sentence_pt ?? ''}</Display>
            {card.gendered_form ? (
              <Body size={15} tone="muted" style={{ marginTop: 2 }}>
                {card.gendered_form}
              </Body>
            ) : null}
          </View>
        </View>

        {/* SRS stats grid */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <StatTile key={s.label} value={s.value} label={s.label} style={styles.statTile} />
          ))}
        </View>

        {/* Editable section */}
        <View style={styles.section}>
          <Mono size={9} style={{ letterSpacing: 0.9, marginBottom: 12 }}>
            EDIT
          </Mono>

          <Body size={12} tone="muted" style={{ marginBottom: 4 }}>
            Sentence
          </Body>

          {editingSentence ? (
            <>
              <TextInput
                value={sentenceDraft}
                onChangeText={setSentenceDraft}
                autoFocus
                autoCorrect={false}
                multiline
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 15,
                  lineHeight: 22,
                  paddingBottom: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.brand,
                  borderStyle: 'dashed',
                  color: '#000000',
                  marginBottom: 10,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity onPress={handleSaveSentence} style={styles.saveBtn}>
                  <Body size={13} style={{ color: '#FFFFFF' }}>
                    Save
                  </Body>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEditingSentence(false)}
                  style={styles.cancelBtn}
                >
                  <Body size={13} tone="muted">
                    Cancel
                  </Body>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setSentenceDraft(card.sentence_pt ?? '');
                setEditingSentence(true);
              }}
              style={{ marginBottom: 16 }}
            >
              <Body
                size={15}
                style={{
                  paddingBottom: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(0,0,0,0.10)',
                  borderStyle: 'dashed',
                }}
              >
                {card.sentence_pt ?? '—'}
              </Body>
            </TouchableOpacity>
          )}

          <Body size={12} tone="muted" style={{ marginBottom: 6 }}>
            Source
          </Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {CANONICAL_SOURCES.map((src) => {
              const isSelected = card.source_tag === src;
              return (
                <TouchableOpacity key={src} onPress={() => handleSourceTap(src)}>
                  <Chip label={src} variant={isSelected ? 'brand' : 'default'} />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={handleCustomSource}>
              <Chip
                label={hasCustomSource ? (card.source_tag ?? '+ tag') : '+ tag'}
                variant={hasCustomSource ? 'brand' : 'default'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.suspendBtn}
            onPress={() => suspendMutation.mutate(!isSuspended)}
          >
            <Body size={15} style={{ color: 'rgba(0,0,0,0.60)' }}>
              {isSuspended ? 'Unsuspend card' : 'Suspend card'}
            </Body>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Body size={15} style={{ color: colors.again }}>
              Delete card
            </Body>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  image: { width: '100%', height: 180 },
  imagePlaceholder: {
    backgroundColor: colors.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  genderRail: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statTile: { width: '48%' },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.paperSoft2,
  },
  saveBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  suspendBtn: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteBtn: { padding: 14, alignItems: 'center' },
});
