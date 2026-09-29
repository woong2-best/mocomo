import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import { uiText } from "@/i18n/ui-text";
import { showIslandError } from "@/ui/IslandToast";

const QNA_NSFW_ID = "NSFW";

function blockedTitle(locale?: string) {
  return uiText(locale, "성인만 가능", "Adults only");
}

function blockedMsg(locale?: string) {
  return uiText(
    locale,
    "프로필에 등록된 생년월일 기준 만 19세 이상만 NSFW 카테고리를 이용할 수 있습니다.",
    "You must be 19 or older (based on the birth date on your profile) to use the NSFW category."
  );
}

function birthDateRequiredMsg(locale?: string) {
  return uiText(
    locale,
    "성인 콘텐츠·유료 기능 이용을 위해 프로필에 생년월일을 등록해 주세요. 허위 정보 기재 시 약관에 따라 계정이 제한될 수 있습니다.",
    "Add your date of birth in your profile to access adult content and paid features. False information may restrict your account under our terms."
  );
}

export function isQnaNsfwCategoryId(id: string | null | undefined): boolean {
  return id === QNA_NSFW_ID;
}

/** Profile birthDate gate for QnA NSFW tab / create chip. */
export async function ensureQnaNsfwAccess(
  categoryId: string | null | undefined,
  locale?: string
): Promise<boolean> {
  if (!isQnaNsfwCategoryId(categoryId)) return true;

  try {
    const status = await fetchAdultVerificationStatus();
    if (status.isAdult || status.canAccessPaidAdult) return true;

    const message = status.hasBirthDate ? blockedMsg(locale) : birthDateRequiredMsg(locale);
    showIslandError(blockedTitle(locale), message);
    return false;
  } catch {
    showIslandError(blockedTitle(locale), birthDateRequiredMsg(locale));
    return false;
  }
}
