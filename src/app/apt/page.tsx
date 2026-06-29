import { redirect } from "next/navigation";
import { APT_GAME_PATH } from "@/lib/site-routes";

/** 구 메인 APT URL — 게임 허브로 이동 */
export default function AptLegacyRedirectPage() {
  redirect(APT_GAME_PATH);
}
