"use server";

import { toggleFollow } from "@/actions/social";

export async function followUserAction(userId: string, username: string) {
  return toggleFollow(userId, username);
}

/** @deprecated tipCreatorAction in @/actions/support 사용 */
export async function tipUserAction(receiverId: string, username: string, amount: number, message?: string) {
  const { tipCreatorAction } = await import("@/actions/support");
  return tipCreatorAction(receiverId, username, amount, message);
}
