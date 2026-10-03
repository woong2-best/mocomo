import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import {
  isR18LiveCategory,
  r18LiveCategoryBlockedMsg,
  r18LiveCategoryBlockedTitle,
} from "@/features/live/live-categories";
import { navigateFromPush } from "@/navigation/navigationRef";
import { showIslandPrompt } from "@/ui/IslandToast";
import { translate } from "@/i18n/runtime";

function birthDateRequiredMsg(locale?: string): string {
  return translate("m.common.add_your_date_of_birth_in");
}

/** Profile birthDate gate for R-18 (DB enum `LIVE`). */
export async function ensureR18LiveAccess(
  categoryId: string | null | undefined,
  locale?: string
): Promise<boolean> {
  if (!isR18LiveCategory(categoryId)) return true;

  try {
    const status = await fetchAdultVerificationStatus();
    if (status.isAdult) return true;

    const message = status.hasBirthDate
      ? r18LiveCategoryBlockedMsg(locale)
      : birthDateRequiredMsg(locale);
    showIslandPrompt(r18LiveCategoryBlockedTitle(locale), message, {
      label: status.hasBirthDate
        ? translate("m.live.ok")
        : translate("m.live.add_birth_date"),
      onPress: () => {
        if (!status.hasBirthDate) navigateFromPush("ProfileEdit");
      },
    });
    return false;
  } catch {
    showIslandPrompt(r18LiveCategoryBlockedTitle(locale), birthDateRequiredMsg(locale), {
      label: translate("m.live.add_birth_date"),
      onPress: () => navigateFromPush("ProfileEdit"),
    });
    return false;
  }
}
