import { revalidatePath, revalidateTag } from "next/cache";
import { profileUserCacheTag } from "@/lib/cache-tags";
import { db } from "@/lib/db";

/** Refresh public profile after verified streaming account link/unlink. */
export async function revalidateProfileStreamingForUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  if (user?.username) {
    revalidatePath(`/u/${user.username}`);
    revalidateTag(profileUserCacheTag(user.username));
  }
  revalidatePath("/settings/profile");
}
