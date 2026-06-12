import { MinigameAchievementsClient } from "@/components/minigames/minigame-achievements-client";

export const metadata = { title: "미니게임 업적 | MoCoMo" };

export default function GamesAchievementsPage() {
  return (
    <div className="p-4 py-8">
      <MinigameAchievementsClient />
    </div>
  );
}
