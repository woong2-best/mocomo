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
    return { error: "자기소개를 확인해 주세요." };
  }
  if (!isPersistablePhotoUrl(photoUrl)) {
    return { error: "사진을 업로드해 주세요." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  if (!user) return { error: "사용자를 찾을 수 없습니다." };

  const existing = await db.cosplayerProfile.findUnique({ where: { userId } });
  if (existing) return { error: "이미 코스어로 등록되어 있습니다." };

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
