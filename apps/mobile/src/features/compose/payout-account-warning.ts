import { ApiError } from "@/api/client";
import { fetchSettlementStatus, type SettlementStatus } from "@/api/settlement";
import { translate } from "@/i18n/runtime";
import { navigationRef } from "@/navigation/navigationRef";
import { showIslandWarning } from "@/ui/IslandToast";

export const SETTLEMENT_ACCOUNT_REQUIRED_CODE = "SETTLEMENT_ACCOUNT_REQUIRED";

export function hasMobilePayoutAccount(status: SettlementStatus | undefined): boolean {
  if (!status) return false;
  return !!(status.payoutsEnabled || status.registered || status.hasConnectAccount);
}

export function isSettlementAccountRequiredError(e: unknown): boolean {
  if (e instanceof ApiError && e.body && typeof e.body === "object") {
    const body = e.body as { code?: string; error?: string };
    if (body.code === SETTLEMENT_ACCOUNT_REQUIRED_CODE) return true;
    if (typeof body.error === "string" && /payout registration is required/i.test(body.error)) {
      return true;
    }
  }
  return e instanceof Error && /payout registration is required/i.test(e.message);
}

export function openPayoutAccountSettings() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate("Wallet", { initialTab: "earnings" });
}

export function showPayoutAccountRequiredWarning() {
  showIslandWarning(translate("m.compose.payout_account_required"), {
    action: {
      label: translate("m.compose.payout_account_settings"),
      onPress: openPayoutAccountSettings,
    },
  });
}

export async function warnIfPayoutAccountMissing() {
  try {
    const status = await fetchSettlementStatus();
    if (hasMobilePayoutAccount(status)) return;
  } catch {
    /* still warn — selling without a confirmed payout account */
  }
  showPayoutAccountRequiredWarning();
}
