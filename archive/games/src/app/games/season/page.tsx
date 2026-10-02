import { MinigameSeasonClient } from "@/components/minigames/minigame-season-client";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export const metadata = { title: "미니게임 시즌 | MoCoMo" };

export default function GamesSeasonPage() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <MinigameSeasonClient />
    </AppPageChrome>
  );
}
