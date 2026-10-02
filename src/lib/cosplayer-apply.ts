import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { profileUserCacheTag } from "@/lib/cache-tags";

const BIO_MAX = 300;

export { BIO_MAX as COSPLAYER_BIO_MAX };

function isPersistablePhotoUrl(url: string) {
  const u = url.trim();
  if (!u || u.startsWith("blob:") || u.startsWith("data:")) return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/");
}

export type CosplayerApplyInput = {
  bio: string;
  photoUrl: string;
};

export type CosplayerApplyResult =
  | { success: true; username: string }
  | { error: string };

/** Create Culture Wiki cosplayer profile (photo + bio). Shared by web action + mobile API. */
export async function applyAsCosplayerForUser(
  userId: string,
  data: CosplayerApplyInput
): Promise<CosplayerApplyResult> {
  const bio = data.bio?.trim() ?? "";
  const photoUrl = data.photoUrl?.trim() ?? "";

  if (!bio || bio.length > BIO_MAX) {
    return { error: "Check your bio." };
  }
  if (!isPersistablePhotoUrl(photoUrl)) {
    return { error: "Upload a photo." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  if (!user) return { error: "User not found." };

  const existing = await db.cosplayerProfile.findUnique({ where: { userId } });
  if (existing) return { error: "You're already registered as a cosplayer." };

  await db.cosplayerProfile.create({
    data: {
      userId,
      bio,
      photos: {
        create: { url: photoUrl },
      },
    },
  });

  revalidatePath("/cosplay");
  revalidatePath("/anime");
  revalidatePath(`/cosplay/${user.username}`);
  revalidatePath(`/u/${user.username}`);
  revalidateTag(profileUserCacheTag(user.username));

  return { success: true, username: user.username };
}
