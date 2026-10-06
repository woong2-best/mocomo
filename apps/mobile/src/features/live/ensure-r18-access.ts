import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import { isR18LiveCategory } from "@/features/live/live-categories";
import { showAgeBlockedModal } from "@/ui/AgeBlockedModal";

/** Profile birthDate gate for R-18 (DB enum `LIVE`). */
export async function ensureR18LiveAccess(
  categoryId: string | null | undefined,
  _locale?: string
): Promise<boolean> {
  if (!isR18LiveCategory(categoryId)) return true;

  try {
    const status = await fetchAdultVerificationStatus();
    if (status.isAdult) return true;
  } catch {
    /* show dialog */
  }
  showAgeBlockedModal("r18");
  return false;
}
