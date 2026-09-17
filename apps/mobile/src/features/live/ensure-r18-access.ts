import { Alert } from "react-native";
import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import {
  R18_LIVE_CATEGORY_BLOCKED_MSG,
  R18_LIVE_CATEGORY_BLOCKED_TITLE,
  isR18LiveCategory,
} from "@/features/live/live-categories";
import { BIRTH_DATE_REQUIRED_MSG } from "@/lib/adult-verification-messages";
import { navigateFromPush } from "@/navigation/navigationRef";

/** Profile birthDate gate for R-18 (DB enum `LIVE`). */
export async function ensureR18LiveAccess(
  categoryId: string | null | undefined
): Promise<boolean> {
  if (!isR18LiveCategory(categoryId)) return true;

  try {
    const status = await fetchAdultVerificationStatus();
    if (status.isAdult) return true;

    return new Promise((resolve) => {
      Alert.alert(
        R18_LIVE_CATEGORY_BLOCKED_TITLE,
        status.hasBirthDate ? R18_LIVE_CATEGORY_BLOCKED_MSG : BIRTH_DATE_REQUIRED_MSG,
        [
          { text: "취소", style: "cancel", onPress: () => resolve(false) },
          {
            text: status.hasBirthDate ? "확인" : "생년월일 입력",
            onPress: () => {
              if (!status.hasBirthDate) navigateFromPush("ProfileEdit");
              resolve(false);
            },
          },
        ]
      );
    });
  } catch {
    return new Promise((resolve) => {
      Alert.alert(R18_LIVE_CATEGORY_BLOCKED_TITLE, BIRTH_DATE_REQUIRED_MSG, [
        { text: "취소", style: "cancel", onPress: () => resolve(false) },
        {
          text: "생년월일 입력",
          onPress: () => {
            navigateFromPush("ProfileEdit");
            resolve(false);
          },
        },
      ]);
    });
  }
}
