import { redirect } from "next/navigation";

/** 굿즈샵 폐지 — 후원(/support)으로 통합 */
export default function MarketLayout() {
  redirect("/support?tab=emoticons");
}
