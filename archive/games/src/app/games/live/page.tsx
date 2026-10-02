import { MinigameLiveClient } from "@/components/minigames/minigame-live-client";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export const metadata = { title: "진행 중 대국 | MoCoMo" };

export default function GamesLivePage() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <MinigameLiveClient />
    </AppPageChrome>
  );
}
