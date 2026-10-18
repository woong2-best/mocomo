import type { StudioDraft } from "@/api/studios";
import { DEFAULT_STUDIO_CATEGORY_ID, STUDIO_CATEGORY_OPTIONS } from "@/features/marketplace/studio-categories";
import { blockHasContent, isHttpsMediaUrl } from "@/features/marketplace/studio-portfolio";

const VALID_CATEGORY = new Set(STUDIO_CATEGORY_OPTIONS.map((item) => item.id));

function tierValid(tier: StudioDraft["tiers"][number]) {
  const name = tier.name.trim();
  const price = Math.floor(tier.price);
  return name.length > 0 && price >= 1000 && price <= 50_000_000;
}

function fieldValid(field: StudioDraft["formFields"][number]) {
  return field.label.trim().length >= 2;
}

export function step1Valid(draft: StudioDraft) {
  const category = draft.category?.trim() || "";
  return (
    VALID_CATEGORY.has(category) &&
    draft.title.trim().length >= 2 &&
    isHttpsMediaUrl(draft.coverUrl) &&
    draft.blocks.some(blockHasContent)
  );
}

export function step2Valid(draft: StudioDraft) {
  const deliveryDays = Math.floor(draft.deliveryDays);
  const revisionNote = draft.revisionNote.trim();
  const tiersOk = draft.tiers.some(tierValid);
  return (
    tiersOk &&
    revisionNote.length >= 8 &&
    deliveryDays >= 1 &&
    deliveryDays <= 90
  );
}

export function step3Valid(draft: StudioDraft) {
  const slotCap = Math.floor(draft.slotCap);
  const fieldsOk = draft.formFields.some(fieldValid);
  return slotCap >= 1 && slotCap <= 20 && fieldsOk;
}

export function normalizeDraft(draft: StudioDraft): StudioDraft {
  return {
    ...draft,
    category: VALID_CATEGORY.has(draft.category) ? draft.category : DEFAULT_STUDIO_CATEGORY_ID,
  };
}
