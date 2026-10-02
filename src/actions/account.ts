import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
    return { error: t("actions.s1mzxopt") };
  }

  const full = await loadAccountDeletionUser(userId);
  if (!full) return { error: t("actions.s1hwfc9a") };

  return requestAccountDeletionForUser(full, data);
}
