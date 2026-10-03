import { useCallback, useState } from "react";
import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import { showIslandPrompt } from "@/ui/IslandToast";
import {
  ADULT_VERIFICATION_REQUIRED_MSG,
  BIRTH_DATE_REQUIRED_MSG,
  type AdultVerificationScope,
} from "@/lib/adult-verification-messages";
import { navigateFromPush } from "@/navigation/navigationRef";
import { translate } from "@/i18n/runtime";

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

      const message = translate(
        status.hasBirthDate ? ADULT_VERIFICATION_REQUIRED_MSG : BIRTH_DATE_REQUIRED_MSG
      );

      showIslandPrompt(translate("m.hooks.age_check_required"), message, {
        label: status.hasBirthDate ? translate("m.live.ok") : translate("m.live.add_birth_date"),
        onPress: () => {
          if (!status.hasBirthDate) openBirthDateSettings();
        },
      });
      return false;
    } catch {
      showIslandPrompt(translate("m.hooks.age_check_required"), translate(BIRTH_DATE_REQUIRED_MSG), {
        label: translate("m.live.add_birth_date"),
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
