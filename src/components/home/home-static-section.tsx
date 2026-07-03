"use client";

import { useSession } from "next-auth/react";
import { HomeGuestHero } from "@/components/home/home-guest-hero";
import { HomeLoggedBanner } from "@/components/home/home-logged-banner";

/**
 * 서버에서 넘긴 isLoggedIn은 초기 SSR·하이드레이션용.
 * 로그인 직후 router 캐시로 서버가 게스트로 남아 있어도 useSession()이 우선한다.
 */
export function HomeStaticSection({ isLoggedIn: serverLoggedIn }: { isLoggedIn: boolean }) {
  const { data: session, status } = useSession();

  const isLoggedIn =
    status === "unauthenticated"
      ? false
      : !!session?.user || (status === "loading" && serverLoggedIn) || serverLoggedIn;

  if (isLoggedIn) return <HomeLoggedBanner />;
  return <HomeGuestHero />;
}
