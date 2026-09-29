import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import {
  isR18LiveCategory,
  r18LiveCategoryBlockedMsg,
  r18LiveCategoryBlockedTitle,
} from "@/features/live/live-categories";
import { uiText } from "@/i18n/ui-text";
import { navigateFromPush } from "@/navigation/navigationRef";
import { showIslandPrompt } from "@/ui/IslandToast";

function birthDateRequiredMsg(locale?: string): string {
  return uiText(
    locale,
    "성인 콘텐츠·유료 기능 이용을 위해 프로필에 생년월일을 등록해 주세요. 허위 정보 기재 시 약관에 따라 계정이 제한될 수 있습니다.",
    "Add your date of birth in your profile to access adult content and paid features. False information may restrict your account under our terms."
  );
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
        ? uiText(locale, "확인", "OK")
        : uiText(locale, "생년월일 입력", "Add birth date"),
      onPress: () => {
        if (!status.hasBirthDate) navigateFromPush("ProfileEdit");
      },
    });
    return false;
  } catch {
    showIslandPrompt(r18LiveCategoryBlockedTitle(locale), birthDateRequiredMsg(locale), {
      label: uiText(locale, "생년월일 입력", "Add birth date"),
      onPress: () => navigateFromPush("ProfileEdit"),
    });
    return false;
  }
}
