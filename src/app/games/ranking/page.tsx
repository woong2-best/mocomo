import { MinigameRankingClient } from "@/components/minigames/minigame-ranking-client";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export const metadata = { title: "미니게임 랭킹 | MoCoMo" };

export default function GamesRankingPage() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <MinigameRankingClient />
    </AppPageChrome>
  );
}
