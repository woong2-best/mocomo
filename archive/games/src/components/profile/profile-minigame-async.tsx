import { ProfileMinigamePanel } from "@/components/profile/profile-minigame-panel";

export async function ProfileMinigameAsync({ username }: { username: string }) {
  return <ProfileMinigamePanel username={username} />;
}
