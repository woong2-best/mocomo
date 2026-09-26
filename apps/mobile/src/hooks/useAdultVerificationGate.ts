import { useCallback, useState } from "react";
import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import { showIslandPrompt } from "@/ui/IslandToast";
import {
  ADULT_VERIFICATION_REQUIRED_MSG,
  BIRTH_DATE_REQUIRED_MSG,
  type AdultVerificationScope,
} from "@/lib/adult-verification-messages";
import { navigateFromPush } from "@/navigation/navigationRef";

export function useAdultVerificationGate(_scope: AdultVerificationScope = "DM_PAID") {
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const status = await fetchAdultVerificationStatus();
    const ok = status.isAdult || status.canAccessPaidAdult;
    setIsAdult(ok);
    return ok;
  }, []);

  const openBirthDateSettings = useCallback(() => {
    navigateFromPush("ProfileEdit");
    return true;
  }, []);

  const ensureAdult = useCallback(async (): Promise<boolean> => {
    try {
      const status = await fetchAdultVerificationStatus();
      const ok = status.isAdult || status.canAccessPaidAdult;
      setIsAdult(ok);
      if (ok) return true;

      const message = status.hasBirthDate
        ? ADULT_VERIFICATION_REQUIRED_MSG
        : BIRTH_DATE_REQUIRED_MSG;

      showIslandPrompt("연령 확인 필요", message, {
        label: status.hasBirthDate ? "확인" : "생년월일 입력",
        onPress: () => {
          if (!status.hasBirthDate) openBirthDateSettings();
        },
      });
      return false;
    } catch {
      showIslandPrompt("연령 확인 필요", BIRTH_DATE_REQUIRED_MSG, {
        label: "생년월일 입력",
        onPress: () => openBirthDateSettings(),
      });
      return false;
    }
  }, [openBirthDateSettings]);

  return {
    isAdult,
    busy,
    ensureAdult,
    refresh,
    /** @deprecated PortOne removed — opens profile birth date settings */
    runVerification: openBirthDateSettings,
  };
}
