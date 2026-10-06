import { useCallback } from "react";
import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import { useAuth } from "@/auth/AuthContext";
import { isMoneyAgeBlocked, moneyAgeFromUser } from "@/lib/money-age";
import { showAgeBlockedModal } from "@/ui/AgeBlockedModal";

export function useMoneyAgeGate() {
  const { user } = useAuth();
  const status = moneyAgeFromUser(user);
  const blocked = isMoneyAgeBlocked(user);

  const ensureMoneyAge = useCallback(async () => {
    let next = moneyAgeFromUser(user);
    try {
      const remote = await fetchAdultVerificationStatus();
      next = remote.moneyAge ?? next;
    } catch {
      /* keep cached session status */
    }
    if (!next || next.allowed) return true;
    showAgeBlockedModal(next.reason === "underage" ? "money-underage" : "money-missing");
    return false;
  }, [user]);

  const ensureNsfwView = useCallback(async () => {
    try {
      const remote = await fetchAdultVerificationStatus();
      if (remote.isAdult) return true;
    } catch {
      /* show dialog */
    }
    showAgeBlockedModal("nsfw-view");
    return false;
  }, []);

  return {
    blocked,
    reason: status?.reason ?? null,
    message: null,
    ensureMoneyAge,
    ensureNsfwView,
    status,
  };
}
