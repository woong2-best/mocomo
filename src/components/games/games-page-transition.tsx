"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameIrisTransition } from "@/components/games/game-iris-transition";

/** /games 하위 — ESC로 APT 내 집으로 돌아갈 때 동물의 숲 스타일 전환 */
export function GamesPageTransition({ children }: { children: React.ReactNode }) {
  const { runWithIris, IrisOverlay } = useGameIrisTransition();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        void runWithIris(() => router.push("/apt"));
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
