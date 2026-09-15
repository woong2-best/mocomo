"use client";

import { HomeGuestHero } from "@/components/home/home-guest-hero";
import { HomeLoggedBanner } from "@/components/home/home-logged-banner";
import { HomeHeroPlaceholder } from "@/components/auth/auth-chrome-placeholder";
import { useAuthReady } from "@/hooks/use-auth-ready";

/**
 * 서버에서 넘긴 isLoggedIn은 초기 SSR·하이드레이션용.
 * 로그인 직후 router 캐시로 서버가 게스트로 남아 있어도 useSession()이 우선한다.
 */
export function HomeStaticSection({ isLoggedIn: serverLoggedIn }: { isLoggedIn: boolean }) {
  const { pending, authenticated } = useAuthReady(serverLoggedIn);

  if (pending && !authenticated) {
    return <HomeHeroPlaceholder />;
  }

  if (authenticated) return <HomeLoggedBanner />;
  return <HomeGuestHero />;
}
