import { MinigameLiveClient } from "@/components/minigames/minigame-live-client";

export const metadata = { title: "진행 중 대국 | MoCoMo" };

export default function GamesLivePage() {
  return (
    <div className="p-4 py-8">
      <MinigameLiveClient />
    </div>
  );
}
