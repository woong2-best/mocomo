"use client";

import { useSearchParams } from "next/navigation";
import { HomeStaticSection } from "@/components/home/home-static-section";
import { HomeFeedCached } from "@/components/home/home-feed-cached";
import { HomeInPageSearch } from "@/components/home/home-in-page-search";

export function HomeClientFrame({ children }: { children: React.ReactNode }) {
  const q = useSearchParams().get("q")?.trim() ?? "";
  if (q) return <HomeInPageSearch query={q} />;

  return (
    <>
      <HomeStaticSection isLoggedIn={false} />
      {children}
      <HomeFeedCached />
    </>
  );
}
