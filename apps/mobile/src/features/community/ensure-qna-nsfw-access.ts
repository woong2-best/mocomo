import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import { showIslandError } from "@/ui/IslandToast";
import { translate } from "@/i18n/runtime";

const QNA_NSFW_ID = "NSFW";

function blockedTitle(locale?: string) {
  return translate("m.common.adults_only");
}

function blockedMsg(locale?: string) {
  return translate("m.community.you_must_be_19_or_older");
}

function birthDateRequiredMsg(locale?: string) {
  return translate("m.common.add_your_date_of_birth_in");
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
