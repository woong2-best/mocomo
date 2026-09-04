"use server";

import { requireAuthForAction } from "@/lib/auth";
import {
  loadAccountDeletionUser,
  requestAccountDeletionForUser,
} from "@/lib/account-deletion-request";

export async function requestAccountDeletion(
  data: Parameters<typeof requestAccountDeletionForUser>[1]
) {
  let userId: string;
  try {
    const sessionUser = await requireAuthForAction();
    userId = sessionUser.id;
  } catch {
    return { error: "로그인이 필요합니다." };
  }

  const full = await loadAccountDeletionUser(userId);
  if (!full) return { error: "계정을 찾을 수 없습니다." };

  return requestAccountDeletionForUser(full, data);
}
