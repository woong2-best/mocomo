import { CREATOR_STUDIO_CATEGORIES, DEFAULT_STUDIO_CATEGORY_ID } from "@/lib/creator-studio-categories";
import type { StudioAddon, StudioField, StudioTier } from "@/lib/creator-studio";
import { blockHasContent, isHttpsMediaUrl, type StudioPortfolioBlock } from "@/lib/studio-portfolio";

const VALID_CATEGORY = new Set(CREATOR_STUDIO_CATEGORIES.map((item) => item.id));

export type StudioDraft = {
  category: string;
  title: string;
  about: string;
  open: boolean;
  slotCap: number;
  deliveryDays: number;
  revisionNote: string;
  currency: string;
  coverUrl: string;
  blocks: StudioPortfolioBlock[];
  tiers: StudioTier[];
  addons: StudioAddon[];
  formFields: StudioField[];
};

function tierValid(tier: StudioTier) {
  const name = tier.name.trim();
  const price = Math.floor(tier.price);
  return name.length > 0 && price >= 1000 && price <= 50_000_000;
}

function fieldValid(field: StudioField) {
  return field.label.trim().length >= 2;
}

export function step1Valid(draft: StudioDraft) {
  return (
    VALID_CATEGORY.has(draft.category?.trim() || "") &&
    draft.title.trim().length >= 2 &&
    isHttpsMediaUrl(draft.coverUrl) &&
    draft.blocks.some(blockHasContent)
  );
}

export function step2Valid(draft: StudioDraft) {
  const deliveryDays = Math.floor(draft.deliveryDays);
  return (
    draft.tiers.some(tierValid) &&
    draft.revisionNote.trim().length >= 8 &&
    deliveryDays >= 1 &&
    deliveryDays <= 90
  );
}

export function step3Valid(draft: StudioDraft) {
  const slotCap = Math.floor(draft.slotCap);
  return slotCap >= 1 && slotCap <= 20 && draft.formFields.some(fieldValid);
}

export function normalizeDraft(draft: StudioDraft): StudioDraft {
  return {
    ...draft,
    category: VALID_CATEGORY.has(draft.category) ? draft.category : DEFAULT_STUDIO_CATEGORY_ID,
  };
}
