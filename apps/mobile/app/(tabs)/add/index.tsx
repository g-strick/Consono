import { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, CardKind, GenerateDraft, ImageResult } from '@/src/lib/api';

type Mode = 'word' | 'sentence';
type Step = 'input' | 'loading' | 'pick-image' | 'pick-sentence' | 'review' | 'saved';

export default function AddScreen() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('word');
  const [step, setStep] = useState<Step>('input');
  const [inputText, setInputText] = useState('');
  const [draft, setDraft] = useState<GenerateDraft | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [selectedSentence, setSelectedSentence] = useState('');
  const [savedCardId, setSavedCardId] = useState<number | null>(null);

  const generateMutation = useMutation({
    mutationFn: ({ text, kind }: { text: string; kind: CardKind }) => api.generate(text, kind),
    onSuccess: (data) => {
      setDraft(data);
      setStep('pick-image');
    },
    onError: () => {
      setStep('input');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!draft || !selectedImage) throw new Error('Missing draft or image');
      return api.approveCard({
        pending_card_id: draft.pending_card_id,
        selected_image_url: selectedImage.url,
        selected_image_attribution: selectedImage.attribution,
        selected_sentence: selectedSentence || draft.draft.fields.sentence_candidates[0],
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
    generateMutation.mutate({ text: inputText.trim(), kind: mode });
  }

  function resetFlow() {
    setStep('input');
    setInputText('');
    setDraft(null);
    setSelectedImage(null);
    setSelectedSentence('');
    setSavedCardId(null);
    generateMutation.reset();
    approveMutation.reset();
  }

  const stepLabel = (): string => {
    if (mode === 'sentence') {
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Nav bar */}
      {step !== 'saved' && (
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3 border-b border-gray-100">
          {step === 'input' ? (
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-content text-base">← Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                if (step === 'pick-image') setStep('input');
                else if (step === 'pick-sentence') setStep('pick-image');
                else if (step === 'review') {
                  setStep(mode === 'sentence' ? 'pick-image' : 'pick-sentence');
                }
              }}
            >
              <Text className="text-content text-base">← Back</Text>
            </TouchableOpacity>
          )}
          {step !== 'input' && step !== 'loading' && (
            <Text className="text-muted text-sm">{stepLabel()}</Text>
          )}
        </View>
      )}

      {step === 'input' && (
        <InputStep
          mode={mode}
          inputText={inputText}
          onInputChange={setInputText}
          onModeToggle={() => {
            setMode((m) => (m === 'word' ? 'sentence' : 'word'));
            setInputText('');
          }}
          onGenerate={handleGenerate}
        />
      )}

      {step === 'loading' && <LoadingStep />}

      {step === 'pick-image' && draft && (
        <PickImageStep
          images={draft.draft.images}
          selected={selectedImage}
          onSelect={(img) => {
            setSelectedImage(img);
          }}
          onNext={() => {
            if (!selectedImage) return;
            setStep(mode === 'sentence' ? 'review' : 'pick-sentence');
          }}
        />
      )}

      {step === 'pick-sentence' && draft && (
        <PickSentenceStep
          candidates={[...draft.draft.fields.sentence_candidates]}
          selected={selectedSentence}
          onSelect={setSelectedSentence}
          onNext={() => setStep('review')}
        />
      )}

      {step === 'review' && draft && selectedImage && (
        <ReviewStep
          draft={draft}
          selectedImage={selectedImage}
          selectedSentence={selectedSentence || draft.draft.fields.sentence_candidates[0]}
          mode={mode}
          isSaving={approveMutation.isPending}
          error={approveMutation.error?.message}
          onSave={() => approveMutation.mutate()}
        />
      )}

      {step === 'saved' && draft && savedCardId !== null && (
        <SavedStep
          cardId={savedCardId}
          headword={mode === 'word' ? draft.draft.fields.lemma : undefined}
          onAddAnother={resetFlow}
          onReview={() => router.push('/review')}
        />
      )}
    </SafeAreaView>
  );
}

function InputStep({
  mode,
  inputText,
  onInputChange,
  onModeToggle,
  onGenerate,
}: {
  mode: Mode;
  inputText: string;
  onInputChange: (t: string) => void;
  onModeToggle: () => void;
  onGenerate: () => void;
}) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View className="flex-1 px-5 pt-8">
      <Text className="text-muted text-xs tracking-widest uppercase mb-4">
        {mode === 'word' ? 'Type a word' : 'Paste a sentence'}
      </Text>

      <TextInput
        ref={inputRef}
        value={inputText}
        onChangeText={onInputChange}
        placeholder={mode === 'word' ? 'e.g. feijoada' : 'Cole aqui…'}
        placeholderTextColor="#5A6995"
        className="text-content text-2xl font-semibold pb-3 border-b border-gray-200"
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        multiline={mode === 'sentence'}
        returnKeyType="done"
        onSubmitEditing={onGenerate}
      />

      <TouchableOpacity onPress={onModeToggle} className="mt-4 mb-8">
        <Text className="text-brand text-sm">
          {mode === 'word' ? 'or paste a sentence to switch flow →' : '← switch to add a word'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onGenerate}
        disabled={!inputText.trim()}
        className="bg-brand rounded-2xl py-4 items-center"
        style={{ opacity: inputText.trim() ? 1 : 0.4 }}
      >
        <Text className="text-white font-semibold text-base">
          {mode === 'word' ? 'Propose card →' : 'Use it →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingStep() {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-6">
      <Text className="text-muted text-xs tracking-widest uppercase">Building card</Text>
      <ActivityIndicator color="#1F3494" size="large" />
      <View className="gap-3 w-full">
        {[
          'Identifying lemma…',
          'Detecting gender…',
          'Generating sentences…',
          'Fetching images…',
        ].map((label) => (
          <View key={label} className="flex-row items-center gap-3">
            <View className="w-4 h-4 rounded-full border border-brand/30 items-center justify-center">
              <ActivityIndicator size="small" color="#1F3494" />
            </View>
            <Text className="text-muted text-sm">{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PickImageStep({
  images,
  selected,
  onSelect,
  onNext,
}: {
  images: ImageResult[];
  selected: ImageResult | null;
  onSelect: (img: ImageResult) => void;
  onNext: () => void;
}) {
  return (
    <View className="flex-1">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-muted text-xs tracking-widest uppercase mb-1">Pick an image</Text>
        <Text className="text-content text-sm">Tap to select</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="flex-row flex-wrap gap-3">
          {images.map((img, i) => {
            const isSelected = selected?.url === img.url;
            return (
              <Pressable key={i} onPress={() => onSelect(img)} style={{ width: '47%' }}>
                <View
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: isSelected ? 3 : 0,
                    borderColor: '#1F3494',
                  }}
                >
                  <Image
                    source={{ uri: img.url }}
                    style={{ width: '100%', height: 140 }}
                    resizeMode="cover"
                  />
                  {isSelected && (
                    <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand items-center justify-center">
                      <Text className="text-white text-xs font-bold">✓</Text>
                    </View>
                  )}
                </View>
                <Text className="text-muted text-xs mt-1 px-1" numberOfLines={1}>
                  {img.attribution}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="px-5 pb-6">
        <TouchableOpacity
          onPress={onNext}
          disabled={!selected}
          className="bg-brand rounded-2xl py-4 items-center"
          style={{ opacity: selected ? 1 : 0.4 }}
        >
          <Text className="text-white font-semibold text-base">Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PickSentenceStep({
  candidates,
  selected,
  onSelect,
  onNext,
}: {
  candidates: string[];
  selected: string;
  onSelect: (s: string) => void;
  onNext: () => void;
}) {
  return (
    <View className="flex-1">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-muted text-xs tracking-widest uppercase mb-1">Pick a sentence</Text>
        <Text className="text-content text-sm">i+1 — only words you know, plus the target</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {candidates.map((sentence, i) => {
          const isSelected = selected === sentence;
          return (
            <Pressable key={i} onPress={() => onSelect(sentence)}>
              <View
                className="rounded-xl px-4 py-4 border"
                style={{
                  borderColor: isSelected ? '#1F3494' : '#E5E5E5',
                  backgroundColor: isSelected ? 'rgba(31,52,148,0.05)' : '#FFFFFF',
                }}
              >
                <Text className="text-content text-base leading-relaxed">{sentence}</Text>
                {isSelected && (
                  <Text className="text-brand text-xs mt-2 font-medium">✓ selected</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="px-5 pb-6 pt-4">
        <TouchableOpacity
          onPress={onNext}
          disabled={!selected}
          className="bg-brand rounded-2xl py-4 items-center"
          style={{ opacity: selected ? 1 : 0.4 }}
        >
          <Text className="text-white font-semibold text-base">Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ReviewStep({
  draft,
  selectedImage,
  selectedSentence,
  mode,
  isSaving,
  error,
  onSave,
}: {
  draft: GenerateDraft;
  selectedImage: ImageResult;
  selectedSentence: string;
  mode: Mode;
  isSaving: boolean;
  error?: string;
  onSave: () => void;
}) {
  const f = draft.draft.fields;
  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-5 pt-4 pb-2">
        <Text className="text-muted text-xs tracking-widest uppercase mb-1">Confere?</Text>
      </View>

      <Image
        source={{ uri: selectedImage.url }}
        style={{ width: '100%', height: 220 }}
        resizeMode="cover"
      />

      <View className="px-5 pt-4 gap-3">
        {mode === 'word' && (
          <>
            <View className="flex-row items-center gap-3">
              <View
                style={{
                  width: 3,
                  height: 36,
                  borderRadius: 2,
                  backgroundColor:
                    f.gender === 'feminine'
                      ? '#E8658A'
                      : f.gender === 'masculine'
                        ? '#1F3494'
                        : '#F0BF38',
                }}
              />
              <View>
                <Text className="text-content text-2xl font-bold">{f.gendered_form}</Text>
                <Text className="text-muted text-sm capitalize">{f.gender}</Text>
              </View>
            </View>

            <FieldRow label="Stress" value={f.stress_marker} />
            <FieldRow label="Context" value={f.usage_context} />
            <FieldRow label="Register" value={f.register_tag} />
            {f.sounds_like && <FieldRow label="Sounds like" value={f.sounds_like} />}
          </>
        )}

        <View className="bg-gray-50 rounded-xl px-4 py-3 mt-1">
          <Text className="text-content text-base leading-relaxed">{selectedSentence}</Text>
        </View>

        {error && <Text className="text-red-500 text-sm text-center">{error}</Text>}

        <TouchableOpacity
          onPress={onSave}
          disabled={isSaving}
          className="bg-brand rounded-2xl py-4 items-center mt-2"
          style={{ opacity: isSaving ? 0.6 : 1 }}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold text-base">Save card →</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline gap-2">
      <Text className="text-muted text-xs w-20">{label}</Text>
      <Text className="text-content text-sm flex-1">{value}</Text>
    </View>
  );
}

function SavedStep({
  cardId,
  headword,
  onAddAnother,
  onReview,
}: {
  cardId: number;
  headword?: string;
  onAddAnother: () => void;
  onReview: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8 gap-6">
      <Text className="text-content text-4xl font-bold text-center">In your queue.</Text>
      <View className="items-center gap-1">
        <Text className="text-muted text-base">card #{cardId} · due now</Text>
        {headword && <Text className="text-content text-lg font-semibold">{headword}</Text>}
      </View>
      <View className="w-full gap-3 mt-4">
        <TouchableOpacity onPress={onReview} className="bg-brand rounded-2xl py-4 items-center">
          <Text className="text-white font-semibold text-base">▶ Review now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAddAnother}
          className="border border-gray-200 rounded-2xl py-4 items-center"
        >
          <Text className="text-content font-medium text-base">+ Add another</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
