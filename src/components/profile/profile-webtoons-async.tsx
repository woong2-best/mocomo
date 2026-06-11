import { auth } from "@/lib/auth";
import { getProfileHeader } from "@/actions/profile-page";
import { getProfileIllustrations } from "@/actions/webtoon";
import { ProfileWebtoonsPanel } from "@/components/profile/profile-webtoons-panel";

export async function ProfileWebtoonsAsync({ username }: { username: string }) {
  const header = await getProfileHeader(username);
  if (!header) return null;

  const session = await auth();
  const works = await getProfileIllustrations(header.user.id, session?.user?.id ?? null);

  return <ProfileWebtoonsPanel works={works} username={header.user.username} />;
}
