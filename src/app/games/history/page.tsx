import { MinigameHistoryClient } from "@/components/minigames/minigame-history-client";

export const metadata = { title: "미니게임 전적 | MoCoMo" };

export default function GamesHistoryPage() {
  return (
    <div className="p-4 py-8">
      <MinigameHistoryClient />
    </div>
  );
}
