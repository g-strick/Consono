import { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, CardKind, GenerateDraft, ImageResult } from '@/src/lib/api';
import { detectKind } from '@/src/lib/detectKind';
import { colors, fonts } from '@/src/lib/theme';
import { Display, Heading, Body, Mono, Action } from '@/src/components/Type';
import { Chip } from '@/src/components/Chip';
import { Card } from '@/src/components/Surface';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'input' | 'loading' | 'pick-image' | 'pick-sentence' | 'review' | 'saved';

// ─── Root screen ─────────────────────────────────────────────────────────────

export default function AddScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight() + insets.bottom;

  // No mode state — kind is derived from detectKind + optional override
  const [kindOverride, setKindOverride] = useState<CardKind | null>(null);
  const [step, setStep] = useState<Step>('input');
  const [inputText, setInputText] = useState('');
  const [draft, setDraft] = useState<GenerateDraft | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [selectedSentence, setSelectedSentence] = useState('');
  const [savedCardId, setSavedCardId] = useState<number | null>(null);

  // Derived kind — recomputed on every render (driven by inputText + override)
  const kind: CardKind = kindOverride ?? detectKind(inputText);

  function handleInputChange(text: string) {
    setInputText(text);
    // Clear override when field is cleared (per detector contract)
    if (text.trim() === '') setKindOverride(null);
  }

  function handleKindOverride() {
    setKindOverride((prev) => {
      if (prev !== null) {
        // Already overriding — flip it
        return prev === 'word' ? 'sentence' : 'word';
      }
      // No override yet — flip from current detected kind
      return kind === 'word' ? 'sentence' : 'word';
    });
  }

  const generateMutation = useMutation({
    mutationFn: ({ text, kind: k }: { text: string; kind: CardKind }) => api.generate(text, k),
    onSuccess: (data, { kind: k }) => {
      setDraft(data);
      // In sentence mode, PickSentenceStep is skipped — pre-populate so selectedSentence
      // is always the final text rather than relying on a fallback at save time.
      if (k === 'sentence') {
        setSelectedSentence(data.draft.fields.sentence_candidates[0]);
      }
      setStep('pick-image');
    },
    onError: () => {
      setStep('input');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (sentence: string) => {
      if (!draft || !selectedImage) throw new Error('Missing draft or image');
      return api.approveCard({
        pending_card_id: draft.pending_card_id,
        selected_image_url: selectedImage.url,
        selected_image_attribution: selectedImage.attribution,
        selected_sentence: sentence,
      });
    },
    onSuccess: (data) => {
      setSavedCardId(data.card_id);
      setStep('saved');
      queryClient.invalidateQueries({ queryKey: ['cards', 'due'] });
    },
  });

  function handleGenerate() {
    if (!inputText.trim()) return;
    setStep('loading');
    generateMutation.mutate({ text: inputText.trim(), kind });
  }

  function resetFlow() {
    setStep('input');
    setInputText('');
    setDraft(null);
    setSelectedImage(null);
    setSelectedSentence('');
    setSavedCardId(null);
    setKindOverride(null);
    generateMutation.reset();
    approveMutation.reset();
  }

  // Step label based on derived kind (word = 4 steps, sentence = 3 steps)
  const stepLabel = (): string => {
    if (kind === 'sentence') {
      const map: Partial<Record<Step, string>> = {
        'pick-image': '2 / 3',
        review: '3 / 3',
      };
      return map[step] ?? '1 / 3';
    }
    const map: Partial<Record<Step, string>> = {
      'pick-image': '2 / 4',
      'pick-sentence': '3 / 4',
      review: '4 / 4',
    };
    return map[step] ?? '1 / 4';
  };

  // Progress bar fill % based on step
  const progressPct = (): number => {
    if (step === 'input') return 8;
    if (step === 'loading') return 42;
    if (step === 'pick-image') return 50;
    if (step === 'pick-sentence') return 75;
    if (step === 'review') return 100;
    return 100;
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.paper }}
      edges={['top', 'left', 'right']}
    >
      {/* Wizard top bar — hidden on saved step */}
      {step !== 'saved' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 6,
            paddingBottom: 8,
            borderBottomWidth: 0.5,
            borderBottomColor: 'rgba(0,0,0,0.08)',
          }}
        >
          {/* Cancel / Back — brand Action */}
          {step === 'input' ? (
            <TouchableOpacity onPress={() => router.back()}>
              <Action>← Cancel</Action>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                if (step === 'pick-image') setStep('input');
                else if (step === 'pick-sentence') setStep('pick-image');
                else if (step === 'review') {
                  setStep(kind === 'sentence' ? 'pick-image' : 'pick-sentence');
                }
              }}
            >
              <Action>← Back</Action>
            </TouchableOpacity>
          )}

          {/* Step label — Mono muted; 'add' on input, 'processing' on loading, 'N/M' on steps */}
          <Mono tone="muted">
            {step === 'input' ? 'add' : step === 'loading' ? 'processing' : stepLabel()}
          </Mono>
        </View>
      )}

      {/* 3px progress bar (brand fill; gold during loading) */}
      {step !== 'saved' && (
        <View
          style={{
            height: 3,
            backgroundColor: colors.paperSoft2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${progressPct()}%`,
              backgroundColor: step === 'loading' ? colors.accent : colors.brand,
              borderRadius: 2,
            }}
          />
        </View>
      )}

      {/* ── Steps ─────────────────────────────────────────────────────────── */}

      {step === 'input' && (
        <InputStep
          kind={kind}
          inputText={inputText}
          onInputChange={handleInputChange}
          onKindOverride={handleKindOverride}
          onGenerate={handleGenerate}
          error={generateMutation.error?.message}
          tabBarHeight={tabBarHeight}
        />
      )}

      {step === 'loading' && <LoadingStep kind={kind} inputText={inputText} />}

      {step === 'pick-image' && draft && (
        <PickImageStep
          images={draft.draft.images}
          selected={selectedImage}
          gender={draft.draft.fields.gender}
          kind={kind}
          onSelect={(img) => setSelectedImage(img)}
          onNext={() => {
            if (!selectedImage) return;
            setStep(kind === 'sentence' ? 'review' : 'pick-sentence');
          }}
          tabBarHeight={tabBarHeight}
        />
      )}

      {step === 'pick-sentence' && draft && (
        <PickSentenceStep
          candidates={[...draft.draft.fields.sentence_candidates]}
          selected={selectedSentence}
          onSelect={setSelectedSentence}
          onNext={() => setStep('review')}
          tabBarHeight={tabBarHeight}
        />
      )}

      {step === 'review' && draft && selectedImage && (
        <ReviewStep
          draft={draft}
          selectedImage={selectedImage}
          selectedSentence={selectedSentence}
          kind={kind}
          isSaving={approveMutation.isPending}
          error={approveMutation.error?.message}
          onSave={(sentence) => approveMutation.mutate(sentence)}
          tabBarHeight={tabBarHeight}
        />
      )}

      {step === 'saved' && draft && savedCardId !== null && (
        <SavedStep
          cardId={savedCardId}
          draft={draft}
          kind={kind}
          onAddAnother={resetFlow}
          onReview={() => router.push('/review')}
        />
      )}
    </SafeAreaView>
  );
}

// ─── InputStep ────────────────────────────────────────────────────────────────

function InputStep({
  kind,
  inputText,
  onInputChange,
  onKindOverride,
  onGenerate,
  error,
  tabBarHeight,
}: {
  kind: CardKind;
  inputText: string;
  onInputChange: (t: string) => void;
  onKindOverride: () => void;
  onGenerate: () => void;
  error?: string;
  tabBarHeight: number;
}) {
  const inputRef = useRef<TextInput>(null);
  const wordCount =
    inputText.trim() === '' ? 0 : inputText.trim().split(/\s+/).filter(Boolean).length;
  const hasInput = inputText.trim().length > 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: tabBarHeight + 16,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Field label */}
      <Mono tone="muted" style={{ marginBottom: 8 }}>
        type a word — or paste a sentence
      </Mono>

      {/* Input area — word: Display field; sentence: Card with serif text */}
      {kind === 'sentence' && hasInput ? (
        <Card radius={10} style={{ paddingHorizontal: 14, paddingVertical: 12, marginBottom: 0 }}>
          <TextInput
            ref={inputRef}
            value={inputText}
            onChangeText={onInputChange}
            placeholder="Cole aqui…"
            placeholderTextColor={colors.brandSoft}
            style={{
              fontFamily: fonts.display,
              fontSize: 17,
              color: '#000000',
              lineHeight: 24,
            }}
            autoFocus
            autoCapitalize="sentences"
            autoCorrect={false}
            multiline
            returnKeyType="done"
            onSubmitEditing={onGenerate}
          />
        </Card>
      ) : (
        <TextInput
          ref={inputRef}
          value={inputText}
          onChangeText={onInputChange}
          placeholder="e.g. feijoada"
          placeholderTextColor="rgba(0,0,0,0.30)"
          style={{
            fontFamily: fonts.display,
            fontSize: 30,
            color: '#000000',
            lineHeight: 32,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.grayRule,
          }}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          multiline={false}
          returnKeyType="done"
          onSubmitEditing={onGenerate}
        />
      )}

      {/* v6 detector chip */}
      {hasInput && (
        <TouchableOpacity
          onPress={onKindOverride}
          style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          {/* Kind dot */}
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: kind === 'word' ? colors.brand : colors.accentDeep,
            }}
          />
          <Body
            size={11}
            tone="primary"
            style={{ color: kind === 'word' ? colors.brand : colors.accentDeep }}
          >
            {kind === 'word'
              ? "word · we'll handle gender"
              : `sentence · ${wordCount} word${wordCount === 1 ? '' : 's'} · no gender step`}
          </Body>
        </TouchableOpacity>
      )}

      {/* Word detected: info card */}
      {kind === 'word' && hasInput && (
        <View
          style={{
            marginTop: 10,
            backgroundColor: colors.paperSoft,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Body size={11} tone="muted">
            building a{' '}
            <Body size={11} tone="primary" style={{ fontFamily: fonts.uiSemibold }}>
              word card
            </Body>
          </Body>
          <Mono size={10} tone="brand">
            4 steps
          </Mono>
        </View>
      )}

      {/* Sentence path: source chips */}
      {kind === 'sentence' && (
        <>
          <Mono tone="muted" style={{ marginTop: 14, marginBottom: 6 }}>
            source{' '}
            <Body size={10} tone="faint" style={{ textTransform: 'none', letterSpacing: 0 }}>
              (optional)
            </Body>
          </Mono>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {['whatsapp', 'instagram', 'netflix', '+ tag'].map((src) => (
              <Chip key={src} label={src} variant="default" />
            ))}
          </View>
          <Body size={11} tone="muted" style={{ marginTop: 6 }}>
            use sentences you read or hear · don't invent
          </Body>
        </>
      )}

      {/* Recent chips (shown when no input) */}
      {!hasInput && (
        <>
          <Mono tone="muted" style={{ marginTop: 20, marginBottom: 6 }}>
            recent
          </Mono>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
            {['saudade', 'ficar', 'já', 'quase'].map((w) => (
              <TouchableOpacity key={w} onPress={() => onInputChange(w)}>
                <Chip label={w} variant="default" />
              </TouchableOpacity>
            ))}
          </View>

          <Mono tone="muted" style={{ marginBottom: 6 }}>
            from frequency list
          </Mono>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            {['→ ainda', '→ porque', '→ embora'].map((w) => (
              <TouchableOpacity key={w} onPress={() => onInputChange(w.replace('→ ', ''))}>
                <Chip label={w} variant="brand" />
              </TouchableOpacity>
            ))}
          </View>

          <Body size={11} tone="muted">
            we detect which, and build the right card.
          </Body>
        </>
      )}

      {/* Error */}
      {error && (
        <View
          style={{
            backgroundColor: '#FEF2F2',
            borderWidth: 0.5,
            borderColor: '#FECACA',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginTop: 12,
          }}
        >
          <Body size={11} weight="semibold" style={{ color: '#DC2626', marginBottom: 2 }}>
            Generation failed
          </Body>
          <Body size={11} style={{ color: '#EF4444' }}>
            {error}
          </Body>
        </View>
      )}

      {/* Propose CTA */}
      <TouchableOpacity
        onPress={onGenerate}
        disabled={!hasInput}
        style={{
          backgroundColor: colors.brand,
          borderRadius: 16,
          paddingVertical: 14,
          alignItems: 'center',
          marginTop: 20,
          opacity: hasInput ? 1 : 0.4,
        }}
      >
        <Action surface="color">Propose card →</Action>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── LoadingStep ──────────────────────────────────────────────────────────────

type PipelineRow = {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
  chip?: boolean;
  mono?: boolean;
  faded?: boolean;
};

function LoadingStep({ kind, inputText }: { kind: CardKind; inputText: string }) {
  const wordPipelineRows: PipelineRow[] = [
    { label: '✓ lemma', value: inputText.trim(), color: colors.good, bold: true },
    { label: '✓ gender', value: 'detecting…', color: colors.good, chip: true },
    { label: '✓ stress', value: '…', color: colors.good, mono: true },
    { label: '○ images', value: '0 / 4', color: colors.brand, mono: true },
    { label: '○ i+1 sentences', value: 'queued', color: 'rgba(0,0,0,0.35)', faded: true },
  ];

  const sentencePipelineRows: PipelineRow[] = [
    { label: '✓ parsed', value: 'known words', color: colors.good, bold: true },
    { label: '✓ image query', value: 'querying…', color: colors.good, bold: true },
    { label: '○ images', value: '0 / 4', color: colors.brand, mono: true },
    { label: '○ gloss', value: 'queued', color: 'rgba(0,0,0,0.35)', faded: true },
  ];

  const rows: PipelineRow[] = kind === 'word' ? wordPipelineRows : sentencePipelineRows;

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
      <Mono tone="muted" style={{ marginBottom: 4 }}>
        building card
      </Mono>

      {kind === 'word' ? (
        <Display size={30} style={{ marginBottom: 10 }}>
          {inputText.trim()}
        </Display>
      ) : (
        <Heading size={19} style={{ marginBottom: 10 }}>
          {inputText.trim()}
        </Heading>
      )}

      <View style={{ gap: 6 }}>
        {rows.map((row) => (
          <View
            key={row.label}
            style={{
              backgroundColor: colors.paper,
              borderWidth: 0.5,
              borderColor: 'rgba(0,0,0,0.08)',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: row.faded ? 0.45 : 1,
            }}
          >
            <Body size={11} style={{ color: row.color }}>
              {row.label}
            </Body>
            {row.chip ? (
              <Chip label="feminine" color={colors.genderFem} />
            ) : row.mono ? (
              <Mono size={10} style={{ color: row.color }}>
                {row.value}
              </Mono>
            ) : (
              <Body size={11} weight={row.bold ? 'semibold' : 'regular'}>
                {row.value}
              </Body>
            )}
          </View>
        ))}
      </View>

      <Body size={11} tone="muted" style={{ marginTop: 'auto', paddingBottom: 20 }}>
        Saved as draft · safe to leave
      </Body>
    </View>
  );
}

// ─── PickImageStep ────────────────────────────────────────────────────────────

function PickImageStep({
  images,
  selected,
  gender,
  kind,
  onSelect,
  onNext,
  tabBarHeight,
}: {
  images: ImageResult[];
  selected: ImageResult | null;
  gender: 'masculine' | 'feminine' | 'common';
  kind: CardKind;
  onSelect: (img: ImageResult) => void;
  onNext: () => void;
  tabBarHeight: number;
}) {
  const genderColor =
    gender === 'feminine'
      ? colors.genderFem
      : gender === 'masculine'
        ? colors.brand
        : colors.accentDeep;

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <Heading size={22}>Pick an image</Heading>
        {kind === 'word' && <Chip label={gender} color={genderColor} />}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarHeight + 16 }}
      >
        {/* 2×2 image grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {images.map((img, i) => {
            const isSelected = selected?.url === img.url;
            return (
              <Pressable key={i} onPress={() => onSelect(img)} style={{ width: '48%' }}>
                <View
                  style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    borderWidth: isSelected ? 2 : 0.5,
                    borderColor: isSelected ? colors.brand : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <Image
                    source={{ uri: img.url }}
                    style={{ width: '100%', height: 110 }}
                    resizeMode="cover"
                  />
                  {isSelected && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: colors.brand,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Body size={11} weight="bold" style={{ color: '#FFFFFF' }}>
                        ✓
                      </Body>
                    </View>
                  )}
                </View>
                <Body
                  size={10}
                  tone="muted"
                  style={{ marginTop: 2, paddingHorizontal: 2 }}
                  numberOfLines={1}
                >
                  {img.attribution}
                </Body>
              </Pressable>
            );
          })}
        </View>

        {/* Hint */}
        <Body size={11} tone="muted" style={{ textAlign: 'center', marginBottom: 8 }}>
          tap to pick · long-press to preview
        </Body>

        {/* Display-only action chips */}
        <View style={{ flexDirection: 'row', gap: 5, marginBottom: 14 }}>
          <Chip label="↻ more" />
          <Chip label="↑ upload" />
          <Chip label="⌕ refine" />
        </View>

        {/* Next CTA */}
        <TouchableOpacity
          onPress={onNext}
          disabled={!selected}
          style={{
            backgroundColor: colors.brand,
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: selected ? 1 : 0.4,
          }}
        >
          <Action surface="color">Next →</Action>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── PickSentenceStep ─────────────────────────────────────────────────────────

function PickSentenceStep({
  candidates,
  selected,
  onSelect,
  onNext,
  tabBarHeight,
}: {
  candidates: string[];
  selected: string;
  onSelect: (s: string) => void;
  onNext: () => void;
  tabBarHeight: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 6,
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <Heading size={22}>Pick a sentence</Heading>
        <Chip label="i+1" variant="brand" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 8,
          paddingBottom: tabBarHeight + 16,
        }}
      >
        <Body size={11} tone="muted" style={{ marginBottom: 4 }}>
          only words you know · plus the target word
        </Body>

        {candidates.map((sentence, i) => {
          const isSelected = selected === sentence;
          return (
            <Pressable key={i} onPress={() => onSelect(sentence)}>
              <View
                style={{
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderWidth: isSelected ? 1.5 : 0.5,
                  borderColor: isSelected ? colors.brand : 'rgba(0,0,0,0.08)',
                  backgroundColor: isSelected ? colors.brandTint : colors.paper,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                {/* Radio dot */}
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    borderWidth: isSelected ? 0 : 1.5,
                    borderColor: 'rgba(0,0,0,0.25)',
                    backgroundColor: isSelected ? colors.brand : 'transparent',
                    marginTop: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && (
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  )}
                </View>
                <Body size={14} style={{ flex: 1, lineHeight: 20 }}>
                  {sentence}
                </Body>
              </View>
            </Pressable>
          );
        })}

        {/* Display-only action chips */}
        <View style={{ flexDirection: 'row', gap: 5, marginTop: 4 }}>
          <Chip label="▶ play all" />
          <Chip label="↻ more" />
          <Chip label="✎ write own" />
        </View>

        {/* Next CTA */}
        <TouchableOpacity
          onPress={onNext}
          disabled={!selected}
          style={{
            backgroundColor: colors.brand,
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: selected ? 1 : 0.4,
            marginTop: 8,
          }}
        >
          <Action surface="color">Next →</Action>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── ReviewStep ───────────────────────────────────────────────────────────────

function ReviewStep({
  draft,
  selectedImage,
  selectedSentence,
  kind,
  isSaving,
  error,
  onSave,
  tabBarHeight,
}: {
  draft: GenerateDraft;
  selectedImage: ImageResult;
  selectedSentence: string;
  kind: CardKind;
  isSaving: boolean;
  error?: string;
  onSave: (sentence: string) => void;
  tabBarHeight: number;
}) {
  const f = draft.draft.fields;
  const genderForCard: 'fem' | 'masc' | 'common' =
    f.gender === 'feminine' ? 'fem' : f.gender === 'masculine' ? 'masc' : 'common';
  const genderColor =
    f.gender === 'feminine'
      ? colors.genderFem
      : f.gender === 'masculine'
        ? colors.brand
        : colors.accentDeep;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }}>
        <Heading size={22}>Confere?</Heading>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {/* Word kind: gender Card with headword, stress, image, sentence */}
        {kind === 'word' ? (
          <Card gender={genderForCard} radius={10} style={{ padding: 12, paddingLeft: 18 }}>
            {/* Headword row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Display size={22}>{f.gendered_form}</Display>
              <Chip
                label={
                  f.gender === 'feminine' ? 'fem.' : f.gender === 'masculine' ? 'masc.' : 'common'
                }
                color={genderColor}
              />
            </View>

            {/* Stress + audio placeholder */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Mono size={12}>{f.stress_marker}</Mono>
            </View>

            {/* Selected image */}
            <Image
              source={{ uri: selectedImage.url }}
              style={{ width: '100%', height: 120, borderRadius: 6 }}
              resizeMode="cover"
            />

            {/* Sentence */}
            <Body
              size={13}
              style={{
                marginTop: 8,
                paddingBottom: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.grayRule,
                borderStyle: 'dashed',
              }}
            >
              {selectedSentence}
            </Body>

            {/* Sentence audio placeholder */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <View
                style={{
                  width: 26,
                  height: 20,
                  borderRadius: 6,
                  borderWidth: 0.5,
                  borderColor: 'rgba(0,0,0,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Body size={10}>▶</Body>
              </View>
              <Body size={11} tone="muted">
                sentence audio
              </Body>
            </View>

            {/* Register chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {f.usage_context && <Chip label={f.usage_context} />}
              {f.register_tag && <Chip label={f.register_tag} />}
            </View>
          </Card>
        ) : (
          /* Sentence kind: plain Card, no gender rail */
          <Card radius={10} style={{ padding: 14 }}>
            {/* Image first */}
            <Image
              source={{ uri: selectedImage.url }}
              style={{ width: '100%', height: 140, borderRadius: 6 }}
              resizeMode="cover"
            />

            {/* Serif sentence headline */}
            <Display size={18} style={{ marginTop: 10 }}>
              {selectedSentence}
            </Display>

            {/* Sentence audio placeholder */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <View
                style={{
                  width: 26,
                  height: 20,
                  borderRadius: 6,
                  borderWidth: 0.5,
                  borderColor: 'rgba(0,0,0,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Body size={10}>▶</Body>
              </View>
              <Body size={11} tone="muted">
                sentence audio
              </Body>
            </View>

            {/* Divider + chips */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 5,
                marginTop: 10,
                paddingTop: 8,
                borderTopWidth: 0.5,
                borderTopColor: 'rgba(0,0,0,0.08)',
              }}
            >
              <Chip label="gloss hidden" />
            </View>
          </Card>
        )}

        {error && (
          <Body size={12} style={{ color: '#EF4444', textAlign: 'center', marginTop: 8 }}>
            {error}
          </Body>
        )}

        {/* Bottom row: ✎ edit + Save */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <TouchableOpacity
            style={{
              width: 56,
              height: 48,
              borderRadius: 16,
              borderWidth: 0.5,
              borderColor: 'rgba(0,0,0,0.15)',
              backgroundColor: colors.paperSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Action tone="muted">✎</Action>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSave(selectedSentence)}
            disabled={isSaving}
            style={{
              flex: 1,
              backgroundColor: colors.brand,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Action surface="color">Save</Action>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── SavedStep ────────────────────────────────────────────────────────────────

function SavedStep({
  cardId,
  draft,
  kind,
  onAddAnother,
  onReview,
}: {
  cardId: number;
  draft: GenerateDraft;
  kind: CardKind;
  onAddAnother: () => void;
  onReview: () => void;
}) {
  const f = draft.draft.fields;
  const genderForCard: 'fem' | 'masc' | 'common' =
    f.gender === 'feminine' ? 'fem' : f.gender === 'masculine' ? 'masc' : 'common';
  const genderColor =
    f.gender === 'feminine'
      ? colors.genderFem
      : f.gender === 'masculine'
        ? colors.brand
        : colors.accentDeep;

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 0 }}>
      {/* Success circle */}
      <View style={{ alignItems: 'center', marginTop: 48, marginBottom: 14 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.brandTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Body size={34} style={{ color: colors.brand }}>
            ✓
          </Body>
        </View>

        <Display size={30} style={{ marginTop: 14, textAlign: 'center' }}>
          In your queue.
        </Display>
        <Body size={11} tone="muted" style={{ marginTop: 4 }}>
          card #{cardId} · due now
        </Body>
      </View>

      {/* Card preview */}
      {kind === 'word' ? (
        <Card gender={genderForCard} radius={10} style={{ padding: 10, paddingLeft: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Body weight="semibold" size={15}>
              {f.gendered_form}
            </Body>
            <Chip label="new" color={genderColor} style={{ marginLeft: 'auto' }} />
          </View>
          <Body size={11} tone="muted">
            next review · &lt; 1 min
          </Body>
        </Card>
      ) : (
        <Card radius={10} style={{ padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Display size={15}>{f.lemma || 'sentence card'}</Display>
            <Chip label="new" variant="brand" style={{ marginLeft: 'auto' }} />
          </View>
          <Body size={11} tone="muted">
            next review · &lt; 1 min
          </Body>
        </Card>
      )}

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 'auto', paddingBottom: 32 }}>
        <TouchableOpacity
          onPress={onAddAnother}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: 'rgba(0,0,0,0.15)',
            backgroundColor: colors.paperSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Action tone="primary">+ Another</Action>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onReview}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 16,
            backgroundColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Action surface="color">▶ Review</Action>
        </TouchableOpacity>
      </View>
    </View>
  );
}
