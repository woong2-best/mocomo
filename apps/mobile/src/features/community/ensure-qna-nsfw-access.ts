import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import { BIRTH_DATE_REQUIRED_MSG } from "@/lib/adult-verification-messages";
import { showIslandError } from "@/ui/IslandToast";

const QNA_NSFW_ID = "NSFW";

const BLOCKED_TITLE = "성인만 가능";
const BLOCKED_MSG =
  "프로필에 등록된 생년월일 기준 만 19세 이상만 NSFW 카테고리를 이용할 수 있습니다.";

export function isQnaNsfwCategoryId(id: string | null | undefined): boolean {
  return id === QNA_NSFW_ID;
}

/** Profile birthDate gate for QnA NSFW tab / create chip. */
export async function ensureQnaNsfwAccess(categoryId: string | null | undefined): Promise<boolean> {
  if (!isQnaNsfwCategoryId(categoryId)) return true;

  try {
    const status = await fetchAdultVerificationStatus();
    if (status.isAdult || status.canAccessPaidAdult) return true;

    const message = status.hasBirthDate ? BLOCKED_MSG : BIRTH_DATE_REQUIRED_MSG;
    showIslandError(BLOCKED_TITLE, message);
    return false;
  } catch {
    showIslandError(BLOCKED_TITLE, BIRTH_DATE_REQUIRED_MSG);
    return false;
  }
}
