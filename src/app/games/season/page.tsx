import { MinigameSeasonClient } from "@/components/minigames/minigame-season-client";

export const metadata = { title: "미니게임 시즌 | MoCoMo" };

export default function GamesSeasonPage() {
  return (
    <div className="p-4 py-8">
      <MinigameSeasonClient />
    </div>
  );
}
