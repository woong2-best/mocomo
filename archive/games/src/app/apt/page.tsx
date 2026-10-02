import { redirect } from "next/navigation";
import { APT_GAME_PATH } from "@/lib/site-routes";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** 구 메인 APT URL — 게임 허브로 이동 (쿼리 유지: decor=mailbox 등) */
export default async function AptLegacyRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") q.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => q.append(key, v));
  }
  const suffix = q.toString() ? `?${q}` : "";
  redirect(`${APT_GAME_PATH}${suffix}`);
}
