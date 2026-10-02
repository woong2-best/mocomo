import { MinigameHistoryClient } from "@/components/minigames/minigame-history-client";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export const metadata = { title: "미니게임 전적 | MoCoMo" };

export default function GamesHistoryPage() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <MinigameHistoryClient />
    </AppPageChrome>
  );
}
