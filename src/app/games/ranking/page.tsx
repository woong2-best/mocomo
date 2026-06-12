import { MinigameRankingClient } from "@/components/minigames/minigame-ranking-client";

export const metadata = { title: "미니게임 랭킹 | MoCoMo" };

export default function GamesRankingPage() {
  return (
    <div className="p-4 py-8">
      <MinigameRankingClient />
    </div>
  );
}
