import { MinigameAchievementsClient } from "@/components/minigames/minigame-achievements-client";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export const metadata = { title: "미니게임 업적 | MoCoMo" };

export default function GamesAchievementsPage() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <MinigameAchievementsClient />
    </AppPageChrome>
  );
}
