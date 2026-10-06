import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import { showAgeBlockedModal } from "@/ui/AgeBlockedModal";

const QNA_NSFW_ID = "NSFW";

export function isQnaNsfwCategoryId(id: string | null | undefined): boolean {
  return id === QNA_NSFW_ID;
}

/** Profile birthDate gate for QnA NSFW tab / create chip. */
export async function ensureQnaNsfwAccess(
  categoryId: string | null | undefined,
  _locale?: string
): Promise<boolean> {
  if (!isQnaNsfwCategoryId(categoryId)) return true;

  try {
    const status = await fetchAdultVerificationStatus();
    if (status.isAdult || status.canAccessPaidAdult) return true;
  } catch {
    /* show dialog */
  }
  showAgeBlockedModal("qna");
  return false;
}
