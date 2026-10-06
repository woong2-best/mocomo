import { useCallback } from "react";
import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { isMoneyAgeBlocked, moneyAgeFromUser } from "@/lib/money-age";
import { navigateFromPush } from "@/navigation/navigationRef";
import { showIslandPrompt } from "@/ui/IslandToast";

export function useMoneyAgeGate() {
  const { user } = useAuth();
  const { t } = useI18n();
  const status = moneyAgeFromUser(user);
  const blocked = isMoneyAgeBlocked(user);
  const message =
    status?.reason === "underage"
      ? t("m.money_age.banner_underage")
      : t("m.money_age.banner_missing");

  const ensureMoneyAge = useCallback(async () => {
    let next = moneyAgeFromUser(user);
    try {
      const remote = await fetchAdultVerificationStatus();
      next = remote.moneyAge ?? next;
    } catch {
      /* keep cached session status */
    }
    if (!next || next.allowed) return true;
    const underage = next.reason === "underage";
    showIslandPrompt(
      t("m.money_age.title"),
      underage ? t("m.money_age.banner_underage") : t("m.money_age.banner_missing"),
      {
        label: underage ? t("m.live.ok") : t("m.money_age.add_birth_date"),
        onPress: () => {
          if (!underage) navigateFromPush("ProfileEdit");
        },
      }
    );
    return false;
  }, [t, user]);

  return { blocked, reason: status?.reason ?? null, message, ensureMoneyAge, status };
}
