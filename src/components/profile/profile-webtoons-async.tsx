import { getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfileIllustrations } from "@/actions/webtoon";
import { ProfileWebtoonsPanel } from "@/components/profile/profile-webtoons-panel";

export async function ProfileWebtoonsAsync({ username }: { username: string }) {
  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });
  if (!user) return null;

  const session = await getCachedSession();
  const works = await getProfileIllustrations(user.id, session?.user?.id ?? null);

  return <ProfileWebtoonsPanel works={works} username={user.username} />;
}
