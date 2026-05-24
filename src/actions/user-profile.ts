"use server";

import { revalidatePath } from "next/cache";
import { toggleFollow } from "@/actions/social";
import { sendTip } from "@/actions/monetization";

export async function followUserAction(userId: string, username: string) {
  await toggleFollow(userId, username);
  revalidatePath(`/u/${username}`);
  revalidatePath(`/u/${username}/followers`);
  revalidatePath(`/u/${username}/following`);
}

/** @deprecated tipCreatorAction in @/actions/support 사용 */
export async function tipUserAction(receiverId: string, username: string, amount: number, message?: string) {
  const { tipCreatorAction } = await import("@/actions/support");
  return tipCreatorAction(receiverId, username, amount, message);
}
