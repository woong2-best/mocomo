import { HomeGuestHero } from "@/components/home/home-guest-hero";
import { HomeLoggedBanner } from "@/components/home/home-logged-banner";

export function HomeStaticSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) return <HomeLoggedBanner />;
  return <HomeGuestHero />;
}
