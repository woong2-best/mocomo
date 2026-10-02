"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameIrisTransition } from "@/components/games/game-iris-transition";
import { APT_GAME_PATH } from "@/lib/site-routes";
import { isAptPublicEnabled } from "@/lib/apt-public-gate";

/** /games 하위 — ESC로 APT 복귀 (APT 공개 시에만) */
export function GamesPageTransition({ children }: { children: React.ReactNode }) {
  const { runWithIris, IrisOverlay } = useGameIrisTransition();
  const router = useRouter();

  useEffect(() => {
    if (!isAptPublicEnabled()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        void runWithIris(() => router.push(APT_GAME_PATH));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runWithIris, router]);

  return (
    <>
      <IrisOverlay />
      {children}
    </>
  );
}
