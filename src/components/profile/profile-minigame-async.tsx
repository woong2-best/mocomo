import { getProfileHeader } from "@/actions/profile-page";
import { ProfileMinigamePanel } from "@/components/profile/profile-minigame-panel";

export async function ProfileMinigameAsync({ username }: { username: string }) {
  const header = await getProfileHeader(username);
  if (!header) return null;
  return <ProfileMinigamePanel username={header.user.username} />;
}
