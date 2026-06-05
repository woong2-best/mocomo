import { HomeGuestHero } from "@/components/home/home-guest-hero";

/** DB 없어도 항상 보이는 홈 상단 (정적) — 광고는 피드 중간에만 표시 */
export function HomeStaticSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) return null;
  return <HomeGuestHero />;
}
