import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import {
  R18_LIVE_CATEGORY_BLOCKED_MSG,
  R18_LIVE_CATEGORY_BLOCKED_TITLE,
  isR18LiveCategory,
} from "@/features/live/live-categories";
import { BIRTH_DATE_REQUIRED_MSG } from "@/lib/adult-verification-messages";
import { navigateFromPush } from "@/navigation/navigationRef";
import { showIslandPrompt } from "@/ui/IslandToast";

/** Profile birthDate gate for R-18 (DB enum `LIVE`). */
export async function ensureR18LiveAccess(
  categoryId: string | null | undefined
): Promise<boolean> {
  if (!isR18LiveCategory(categoryId)) return true;

  try {
    const status = await fetchAdultVerificationStatus();
    if (status.isAdult) return true;

    const message = status.hasBirthDate ? R18_LIVE_CATEGORY_BLOCKED_MSG : BIRTH_DATE_REQUIRED_MSG;
    showIslandPrompt(R18_LIVE_CATEGORY_BLOCKED_TITLE, message, {
      label: status.hasBirthDate ? "확인" : "생년월일 입력",
      onPress: () => {
        if (!status.hasBirthDate) navigateFromPush("ProfileEdit");
      },
    });
    return false;
  } catch {
    showIslandPrompt(R18_LIVE_CATEGORY_BLOCKED_TITLE, BIRTH_DATE_REQUIRED_MSG, {
      label: "생년월일 입력",
      onPress: () => navigateFromPush("ProfileEdit"),
    });
    return false;
  }
}
