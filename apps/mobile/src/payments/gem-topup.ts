import * as Linking from "expo-linking";
import { confirmCheckout } from "@/api/checkout";
import { topupGems } from "@/api/gems";
import { translate } from "@/i18n/runtime";

/** Gem top-up — external browser only (no WebView), per Gems spec */
export async function openGemTopupCheckout(
  gems: number,
  locale?: string
): Promise<{ ok: true } | { error: string }> {
  try {
    const { checkoutUrl } = await topupGems(gems);
    await Linking.openURL(checkoutUrl);
    return { ok: true };
  } catch (e: unknown) {
    return {
      error:
        e instanceof Error
          ? e.message
          : translate("m.payments.could_not_start_moco_top_up"),
    };
  }
}

/** After user returns from browser — confirm Stripe session if session_id available */
export async function confirmGemTopupSession(sessionId: string) {
  return confirmCheckout(sessionId);
}
