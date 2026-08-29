import type { Metadata } from "next";
import { Suspense } from "react";
import { LiarGameClient } from "@/components/liar-game/liar-game-client";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export const metadata: Metadata = {
  title: "라이어 게임 | MoCoMo",
  description: "제시어를 아는 시민 vs 모르는 라이어 — 3인 이상 토론 & 투표",
};

export default function LiarGamePage() {
  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">불러오는 중…</div>}>
        <LiarGameClient />
      </Suspense>
    </AppPageChrome>
  );
}
