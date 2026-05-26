"use client";

import { useSession } from "next-auth/react";
import { HomeStaticSection } from "@/components/home/home-static-section";

/** DB 대기 없이 바로 그리는 홈 상단 */
export function HomeShell() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user;

  return <HomeStaticSection isLoggedIn={isLoggedIn} />;
}
