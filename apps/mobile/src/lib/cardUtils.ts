import type { AllCard } from './api';

export type RegisterTag = 'formal' | 'neutral' | 'informal' | 'slang' | 'vulgar';
export type GenderValue = 'masculine' | 'feminine' | 'common';
export type SrsStateFilter = 'new' | 'learning' | 'review' | 'relearning' | 'suspended';

export type ActiveFilters = {
  gender: GenderValue[];
  source_tag: string[];
  register: RegisterTag[];
  srs_state: SrsStateFilter[];
};

export function filterCards(cards: AllCard[], filters: ActiveFilters): AllCard[] {
  return cards.filter((c) => {
    const genderMatch =
      filters.gender.length === 0 ||
      (c.gender != null && filters.gender.includes(c.gender as GenderValue));

    const sourceMatch =
      filters.source_tag.length === 0 ||
      (c.source_tag != null && filters.source_tag.includes(c.source_tag));

    const registerMatch =
      filters.register.length === 0 ||
      (c.register_tag != null && filters.register.includes(c.register_tag as RegisterTag));

    const stateMatch =
      filters.srs_state.length === 0 ||
      (filters.srs_state.includes('suspended')
        ? c.suspended_at != null
        : c.suspended_at == null && filters.srs_state.includes(c.state as SrsStateFilter));

    return genderMatch && sourceMatch && registerMatch && stateMatch;
  });
}

export function formatDueAt(dueAt: string): string {
  const due = new Date(dueAt);
  const now = new Date();
  const tomorrowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dayAfterMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  if (due < tomorrowMidnight) return 'Today';
  if (due < dayAfterMidnight) return 'Tomorrow';
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatLastReviewed(lastReviewedAt: string | null): string {
  if (!lastReviewedAt) return 'Never';
  const last = new Date(lastReviewedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}
