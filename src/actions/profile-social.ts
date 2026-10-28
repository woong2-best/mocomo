"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { profileUserCacheTag } from "@/lib/cache-tags";
import { requireAuth } from "@/lib/auth";
import {
  PROFILE_SOCIAL_PROVIDERS,
  setProfileSocialDisplayed,
  type ProfileSocialId,
} from "@/lib/profile-social";

export async function setSocialDisplayed(id: ProfileSocialId, displayed: boolean) {
  if (!(PROFILE_SOCIAL_PROVIDERS as readonly string[]).includes(id)) {
    return { error: "Invalid request." };
  }
  const user = await requireAuth();
  await setProfileSocialDisplayed(user.id, id, displayed);
  revalidatePath("/settings/profile");
  revalidatePath(`/u/${user.username}`);
  revalidateTag(profileUserCacheTag(user.username));
  return { success: true };
}
