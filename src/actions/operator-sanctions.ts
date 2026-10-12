"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  applyModeratorAction,
  findUserForSanctionLookup,
  getPendingSanctionNotice,
  liftAccountRestriction,
  listSanctionsForUser,
  markSanctionNoticeSeen,
  requireContentModerator,
  restoreHiddenContent,
  submitAppealForUser,
  type ContentTargetType,
  type ModeratorAction,
} from "@/lib/operator-sanctions";
import { revalidatePath } from "next/cache";

const actionSchema = z.object({
  action: z.enum([
    "CONTENT_REMOVE",
    "SUSPEND_24H",
    "SUSPEND_3D",
    "SUSPEND_5D",
    "SUSPEND_PERMANENT",
  ]),
  targetType: z.enum(["POST", "USED_LISTING", "MARKETPLACE_LISTING"]),
  targetId: z.string().min(1).max(80),
  reason: z.string().trim().max(2000).optional(),
});

export async function operatorModerateContent(input: {
  action: ModeratorAction;
  targetType: ContentTargetType;
  targetId: string;
  reason?: string;
}) {
  const admin = await requireContentModerator();
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid request." };
  return applyModeratorAction({
    actorId: admin.id,
    action: parsed.data.action,
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    reason: parsed.data.reason,
  });
}

export async function operatorRestoreContent(input: {
  targetType: ContentTargetType;
  targetId: string;
  note?: string;
}) {
  const admin = await requireContentModerator();
  return restoreHiddenContent({
    actorId: admin.id,
    targetType: input.targetType,
    targetId: input.targetId,
    note: input.note,
  });
}

export async function operatorLiftRestriction(userId: string, note?: string) {
  const admin = await requireContentModerator();
  return liftAccountRestriction({ actorId: admin.id, userId, note });
}

export async function searchUserSanctions(query: string) {
  await requireContentModerator();
  const user = await findUserForSanctionLookup(query);
  if (!user) return { error: "User not found." as const, user: null, sanctions: [] };
  const sanctions = await listSanctionsForUser(user.id);
  return { user, sanctions };
}

export async function loadMySanctionNotice() {
  const sessionUser = await requireAuth({ writeKind: "notification" }).catch(() => null);
  if (!sessionUser) return { notice: null };
  const notice = await getPendingSanctionNotice(sessionUser.id);
  return { notice };
}

export async function ackSanctionNotice(sanctionId?: string) {
  const user = await requireAuth({ writeKind: "notification" });
  await markSanctionNoticeSeen(user.id, sanctionId);
  return { success: true };
}

const appealSchema = z.object({
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(20).max(5000),
  contactEmail: z.string().email(),
  sanctionId: z.string().optional(),
});

export async function submitModerationAppeal(data: z.infer<typeof appealSchema>) {
  const user = await requireAuth({ writeKind: "appeal" });
  const parsed = appealSchema.safeParse(data);
  if (!parsed.success) return { error: "Please check the appeal form." };
  const result = await submitAppealForUser({ userId: user.id, ...parsed.data });
  if ("success" in result) revalidatePath("/appeal");
  return result;
}
