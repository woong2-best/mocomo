import * as Linking from "expo-linking";
import { confirmCheckout } from "@/api/checkout";
import { topupGems } from "@/api/gems";

/** Gem top-up — external browser only (no WebView), per Gems spec */
export async function openGemTopupCheckout(gems: number): Promise<{ ok: true } | { error: string }> {
  try {
    const { checkoutUrl } = await topupGems(gems);
    await Linking.openURL(checkoutUrl);
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "젬 충전을 시작할 수 없습니다." };
  }
}

/** After user returns from browser — confirm Stripe session if session_id available */
export async function confirmGemTopupSession(sessionId: string) {
  return confirmCheckout(sessionId);
}
