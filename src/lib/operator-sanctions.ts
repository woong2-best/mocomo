import { revalidatePath, revalidateTag } from "next/cache";
import type {
  AccountStatus,
  OperatorSanctionKind,
  OperatorSanctionTargetType,
} from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canModerateContent } from "@/lib/content-moderator";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import { hydrateUserOAuthProfile } from "@/lib/oauth-vault";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { getAppBaseUrl } from "@/lib/auth-tokens";
import { isReadOnlySuspended, isServiceBanned } from "@/lib/account-status";
import { expireTemporarySuspensionIfNeeded } from "@/lib/expire-suspension";

export type ContentTargetType = "POST" | "USED_LISTING" | "MARKETPLACE_LISTING";

export type ModeratorAction =
  | "CONTENT_REMOVE"
  | "SUSPEND_24H"
  | "SUSPEND_3D"
  | "SUSPEND_5D"
  | "SUSPEND_PERMANENT";

const DEFAULT_CONTENT_REASON =
  "This post was removed because it was judged to violate MoCoMo's terms of service.";
const DEFAULT_SUSPEND_REASON =
  "Your account was restricted because activity on MoCoMo was judged to violate the terms of service.";

export { canModerateContent };

export async function requireContentModerator() {
  const user = await requireAuth();
  if (!canModerateContent(user)) throw new Error("FORBIDDEN");
  return user;
}

export function isVisibleContentWhere() {
  return { removedAt: null };
}

async function resolveContactEmail(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, email: true, passwordHash: true },
  });
  if (!user) return null;
  const hydrated = await hydrateUserOAuthProfile(user);
  return hydrated.email?.trim() || null;
}

function sanctionEmailCopy(kind: OperatorSanctionKind, endsAt: Date | null) {
  const until = endsAt ? endsAt.toISOString() : null;
  switch (kind) {
    case "CONTENT_REMOVE":
      return {
        subject: "[MoCoMo] A post was removed for a terms violation",
        title: "A post was removed",
        body: "Operators removed one of your posts after judging that it violated MoCoMo's terms of service. The post is hidden from other users. You can appeal this decision.",
      };
    case "SUSPEND_24H":
    case "SUSPEND_3D":
    case "SUSPEND_5D":
      return {
        subject: "[MoCoMo] Your account is in read-only mode",
        title: "Account temporarily restricted",
        body: `Your account is in read-only mode until ${until ?? "the listed end time"}. You can browse, but posting, likes, comments, and other writes are blocked. You can appeal this decision.`,
      };
    case "SUSPEND_PERMANENT":
      return {
        subject: "[MoCoMo] Your account was permanently restricted",
        title: "Account permanently restricted",
        body: "Your account is permanently in read-only mode. You can browse, but writes are blocked. You can appeal this decision.",
      };
    case "RESTORE_CONTENT":
      return {
        subject: "[MoCoMo] A removed post was restored",
        title: "Post restored",
        body: "Operators restored a post that had been hidden. It is visible again with the same likes, comments, and timeline position.",
      };
    case "LIFT_SUSPENSION":
      return {
        subject: "[MoCoMo] Your account restriction was lifted",
        title: "Account restored",
        body: "Operators lifted your account restriction. You can use MoCoMo normally again.",
      };
    default:
      return {
        subject: "[MoCoMo] Account notice",
        title: "Account notice",
        body: "There is an update to a moderation action on your account.",
      };
  }
}

async function notifyUserSanction(input: {
  userId: string;
  kind: OperatorSanctionKind;
  reason: string;
  endsAt: Date | null;
  sanctionId: string;
}) {
  const copy = sanctionEmailCopy(input.kind, input.endsAt);
  const appealUrl = `${getAppBaseUrl()}/appeal`;
  await createNotification({
    userId: input.userId,
    type: "SYSTEM",
    title: copy.title,
    body: input.reason || copy.body,
    link: "/appeal",
  });
  const email = await resolveContactEmail(input.userId);
  if (!email) return;
  await sendEmail({
    to: email,
    subject: copy.subject,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.5;color:#111">
        <p style="margin:0 0 8px;font-size:18px;font-weight:600">${copy.title}</p>
        <p style="margin:0 0 12px;color:#333">${copy.body}</p>
        <p style="margin:0 0 16px;color:#333">${input.reason}</p>
        <p style="margin:0 0 12px">
          <a href="${appealUrl}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Submit an appeal</a>
        </p>
        <p style="margin:0;font-size:12px;color:#666">Sanction ID: ${input.sanctionId}</p>
      </div>
    `,
  });
}

async function resolveContentOwner(targetType: ContentTargetType, targetId: string) {
  if (targetType === "POST") {
    const post = await db.post.findUnique({
      where: { id: targetId },
      select: { id: true, authorId: true, title: true, removedAt: true },
    });
    if (!post) return null;
    return { ownerId: post.authorId, title: post.title, alreadyRemoved: !!post.removedAt };
  }
  if (targetType === "USED_LISTING") {
    const listing = await db.usedListing.findUnique({
      where: { id: targetId },
      select: { id: true, sellerId: true, title: true, removedAt: true },
    });
    if (!listing) return null;
    return { ownerId: listing.sellerId, title: listing.title, alreadyRemoved: !!listing.removedAt };
  }
  const listing = await db.marketplaceListing.findUnique({
    where: { id: targetId },
    select: { id: true, sellerId: true, title: true, removedAt: true },
  });
  if (!listing) return null;
    return { ownerId: listing.sellerId, title: listing.title, alreadyRemoved: !!listing.removedAt };
}

async function hideContent(targetType: ContentTargetType, targetId: string, actorId: string, reason: string) {
  const data = { removedAt: new Date(), removedById: actorId, removalReason: reason };
  if (targetType === "POST") {
    await db.post.update({ where: { id: targetId }, data });
    return;
  }
  if (targetType === "USED_LISTING") {
    await db.usedListing.update({ where: { id: targetId }, data });
    return;
  }
  await db.marketplaceListing.update({ where: { id: targetId }, data });
}

async function unhideContent(targetType: ContentTargetType, targetId: string) {
  const data = { removedAt: null, removedById: null, removalReason: null };
  if (targetType === "POST") {
    await db.post.update({ where: { id: targetId }, data });
    return;
  }
  if (targetType === "USED_LISTING") {
    await db.usedListing.update({ where: { id: targetId }, data });
    return;
  }
  await db.marketplaceListing.update({ where: { id: targetId }, data });
}

function revalidateContent(targetType: ContentTargetType, targetId: string) {
  revalidateTag(FEED_POSTS_CACHE_TAG);
  revalidatePath(COMMUNITY_FEED_PATH);
  revalidatePath("/qna");
  revalidatePath("/market");
  revalidatePath("/admin");
  revalidatePath("/admin/suspensions");
  if (targetType === "POST") revalidatePath(`/post/${targetId}`);
  if (targetType === "USED_LISTING") revalidatePath(`/market/${targetId}`);
}

function suspendUntil(kind: Extract<ModeratorAction, `SUSPEND_${string}`>): Date | null {
  const now = Date.now();
  if (kind === "SUSPEND_24H") return new Date(now + 24 * 60 * 60 * 1000);
  if (kind === "SUSPEND_3D") return new Date(now + 3 * 24 * 60 * 60 * 1000);
  if (kind === "SUSPEND_5D") return new Date(now + 5 * 24 * 60 * 60 * 1000);
  return null;
}

export async function applyModeratorAction(input: {
  actorId: string;
  action: ModeratorAction;
  targetType: ContentTargetType;
  targetId: string;
  reason?: string;
}) {
  const content = await resolveContentOwner(input.targetType, input.targetId);
  if (!content) return { error: "Target not found." as const };
  if (content.ownerId === input.actorId) return { error: "You cannot moderate your own account." as const };

  const reason =
    input.reason?.trim() ||
    (input.action === "CONTENT_REMOVE" ? DEFAULT_CONTENT_REASON : DEFAULT_SUSPEND_REASON);

  if (input.action === "CONTENT_REMOVE") {
    if (content.alreadyRemoved) return { error: "This post is already hidden." as const };
    await hideContent(input.targetType, input.targetId, input.actorId, reason);
    const sanction = await db.operatorSanction.create({
      data: {
        userId: content.ownerId,
        actorId: input.actorId,
        kind: "CONTENT_REMOVE",
        targetType: input.targetType,
        targetId: input.targetId,
        reason,
        metadata: { title: content.title },
      },
    });
    await db.modLog.create({
      data: {
        actorId: input.actorId,
        targetId: content.ownerId,
        action: "force_hide_content",
        reason,
        metadata: { targetType: input.targetType, targetId: input.targetId },
      },
    });
    await logSiteAdminAudit({
      actorId: input.actorId,
      action: "MODERATION_ACTION",
      targetType: input.targetType.toLowerCase(),
      targetId: input.targetId,
      metadata: { kind: "CONTENT_REMOVE", userId: content.ownerId },
    });
    revalidateContent(input.targetType, input.targetId);
    void notifyUserSanction({
      userId: content.ownerId,
      kind: "CONTENT_REMOVE",
      reason,
      endsAt: null,
      sanctionId: sanction.id,
    });
    return { success: true as const, sanctionId: sanction.id };
  }

  const target = await db.user.findUnique({
    where: { id: content.ownerId },
    select: { accountStatus: true },
  });
  if (!target) return { error: "User not found." as const };

  const endsAt = suspendUntil(input.action);
  const nextStatus: AccountStatus =
    input.action === "SUSPEND_PERMANENT" ? "PERMANENT_SUSPENDED" : "TEMP_SUSPENDED";

  await db.user.update({
    where: { id: content.ownerId },
    data: {
      accountStatus: nextStatus,
      isBanned: false,
      suspensionReason: reason,
      suspendedAt: new Date(),
      suspendedById: input.actorId,
      suspensionExpiresAt: endsAt,
      banReason: null,
      bannedUntil: null,
    },
  });

  const sanction = await db.operatorSanction.create({
    data: {
      userId: content.ownerId,
      actorId: input.actorId,
      kind: input.action,
      targetType: "ACCOUNT",
      targetId: content.ownerId,
      reason,
      endsAt,
      metadata: { sourceTargetType: input.targetType, sourceTargetId: input.targetId },
    },
  });

  await db.accountSuspensionLog.create({
    data: {
      userId: content.ownerId,
      actorId: input.actorId,
      previousStatus: target.accountStatus,
      newStatus: nextStatus,
      reason,
      isPermanent: input.action === "SUSPEND_PERMANENT",
      metadata: { until: endsAt?.toISOString() ?? null, sanctionId: sanction.id },
    },
  });
  await db.modLog.create({
    data: {
      actorId: input.actorId,
      targetId: content.ownerId,
      action: `account_status_${nextStatus.toLowerCase()}`,
      reason,
      metadata: { until: endsAt?.toISOString() ?? null },
    },
  });
  await logSiteAdminAudit({
    actorId: input.actorId,
    action: "USER_SUSPEND",
    targetType: "user",
    targetId: content.ownerId,
    metadata: { kind: input.action, endsAt: endsAt?.toISOString() ?? null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/suspensions");
  void notifyUserSanction({
    userId: content.ownerId,
    kind: input.action,
    reason,
    endsAt,
    sanctionId: sanction.id,
  });
  return { success: true as const, sanctionId: sanction.id };
}

export async function restoreHiddenContent(input: {
  actorId: string;
  targetType: ContentTargetType;
  targetId: string;
  note?: string;
}) {
  const content = await resolveContentOwner(input.targetType, input.targetId);
  if (!content) return { error: "Target not found." as const };
  if (!content.alreadyRemoved) return { error: "This post is not hidden." as const };

  await unhideContent(input.targetType, input.targetId);

  const open = await db.operatorSanction.findFirst({
    where: {
      userId: content.ownerId,
      kind: "CONTENT_REMOVE",
      targetType: input.targetType,
      targetId: input.targetId,
      reversedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
  if (open) {
    await db.operatorSanction.update({
      where: { id: open.id },
      data: { reversedAt: new Date(), reversedById: input.actorId },
    });
  }

  const sanction = await db.operatorSanction.create({
    data: {
      userId: content.ownerId,
      actorId: input.actorId,
      kind: "RESTORE_CONTENT",
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.note ?? "Restored by operator",
      metadata: { restoredSanctionId: open?.id ?? null },
    },
  });

  await db.modLog.create({
    data: {
      actorId: input.actorId,
      targetId: content.ownerId,
      action: "restore_hidden_content",
      reason: input.note ?? "Restored by operator",
      metadata: { targetType: input.targetType, targetId: input.targetId },
    },
  });
  await logSiteAdminAudit({
    actorId: input.actorId,
    action: "MODERATION_ACTION",
    targetType: input.targetType.toLowerCase(),
    targetId: input.targetId,
    metadata: { kind: "RESTORE_CONTENT", userId: content.ownerId },
  });
  revalidateContent(input.targetType, input.targetId);
  void notifyUserSanction({
    userId: content.ownerId,
    kind: "RESTORE_CONTENT",
    reason: input.note ?? "Restored by operator",
    endsAt: null,
    sanctionId: sanction.id,
  });
  return { success: true as const };
}

export async function liftAccountRestriction(input: { actorId: string; userId: string; note?: string }) {
  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { accountStatus: true },
  });
  if (!target) return { error: "User not found." as const };

  await db.user.update({
    where: { id: input.userId },
    data: {
      accountStatus: "ACTIVE",
      isBanned: false,
      suspensionReason: null,
      suspendedAt: null,
      suspendedById: null,
      suspensionExpiresAt: null,
      banReason: null,
      bannedUntil: null,
    },
  });

  await db.operatorSanction.updateMany({
    where: {
      userId: input.userId,
      kind: { in: ["SUSPEND_24H", "SUSPEND_3D", "SUSPEND_5D", "SUSPEND_PERMANENT"] },
      reversedAt: null,
    },
    data: { reversedAt: new Date(), reversedById: input.actorId },
  });

  const sanction = await db.operatorSanction.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      kind: "LIFT_SUSPENSION",
      targetType: "ACCOUNT",
      targetId: input.userId,
      reason: input.note ?? "Restriction lifted by operator",
    },
  });

  await db.accountSuspensionLog.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      previousStatus: target.accountStatus,
      newStatus: "ACTIVE",
      reason: input.note ?? "Restriction lifted by operator",
    },
  });
  await logSiteAdminAudit({
    actorId: input.actorId,
    action: "USER_RESTORE",
    targetType: "user",
    targetId: input.userId,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/suspensions");
  void notifyUserSanction({
    userId: input.userId,
    kind: "LIFT_SUSPENSION",
    reason: input.note ?? "Restriction lifted by operator",
    endsAt: null,
    sanctionId: sanction.id,
  });
  return { success: true as const };
}

export async function findUserForSanctionLookup(query: string) {
  const q = query.trim();
  if (!q) return null;
  return db.user.findFirst({
    where: {
      OR: [{ id: q }, { username: { equals: q, mode: "insensitive" } }],
    },
    select: {
      id: true,
      username: true,
      name: true,
      accountStatus: true,
      suspensionReason: true,
      suspendedAt: true,
      suspensionExpiresAt: true,
      isBanned: true,
    },
  });
}

export async function listSanctionsForUser(userId: string) {
  return db.operatorSanction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { id: true, username: true } },
      reversedBy: { select: { id: true, username: true } },
    },
  });
}

export type PendingSanctionNotice = {
  id: string;
  kind: OperatorSanctionKind;
  targetType: OperatorSanctionTargetType;
  targetId: string | null;
  reason: string | null;
  startsAt: string;
  endsAt: string | null;
  accountStatus: AccountStatus;
  readOnly: boolean;
};

export async function getPendingSanctionNotice(userId: string): Promise<PendingSanctionNotice | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      accountStatus: true,
      isBanned: true,
      suspensionExpiresAt: true,
    },
  });
  if (!user) return null;
  if (await expireTemporarySuspensionIfNeeded({ id: userId, ...user })) {
    return null;
  }

  const row = await db.operatorSanction.findFirst({
    where: {
      userId,
      noticeSeenAt: null,
      kind: { in: ["CONTENT_REMOVE", "SUSPEND_24H", "SUSPEND_3D", "SUSPEND_5D", "SUSPEND_PERMANENT"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;

  const refreshed = await db.user.findUnique({
    where: { id: userId },
    select: { accountStatus: true, isBanned: true },
  });
  return {
    id: row.id,
    kind: row.kind,
    targetType: row.targetType,
    targetId: row.targetId,
    reason: row.reason,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    accountStatus: refreshed?.accountStatus ?? user.accountStatus,
    readOnly:
      isReadOnlySuspended(refreshed?.accountStatus ?? user.accountStatus) ||
      isServiceBanned(refreshed ?? user),
  };
}

export async function markSanctionNoticeSeen(userId: string, sanctionId?: string) {
  await db.operatorSanction.updateMany({
    where: {
      userId,
      noticeSeenAt: null,
      ...(sanctionId ? { id: sanctionId } : {}),
    },
    data: { noticeSeenAt: new Date() },
  });
}

export function userCanAppealNow(user: {
  accountStatus: AccountStatus;
  isBanned: boolean;
  hasUnrestoredContent?: boolean;
}) {
  return (
    isReadOnlySuspended(user.accountStatus) ||
    isServiceBanned(user) ||
    Boolean(user.hasUnrestoredContent)
  );
}

export async function submitAppealForUser(input: {
  userId: string;
  title: string;
  content: string;
  contactEmail: string;
  sanctionId?: string;
}) {
  const dbUser = await db.user.findUnique({
    where: { id: input.userId },
    select: { accountStatus: true, suspensionReason: true, isBanned: true },
  });
  if (!dbUser) return { error: "User not found." as const };

  const unrestored = await db.operatorSanction.findFirst({
    where: { userId: input.userId, kind: "CONTENT_REMOVE", reversedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!userCanAppealNow({ ...dbUser, hasUnrestoredContent: !!unrestored })) {
    return { error: "There is no active restriction to appeal." as const };
  }

  const { OPEN_APPEAL_STATUSES } = await import("@/lib/account-status");
  const existing = await db.accountAppeal.findFirst({
    where: { userId: input.userId, status: { in: [...OPEN_APPEAL_STATUSES] } },
  });
  if (existing) return { error: "An appeal is already being reviewed." as const };

  const sanction = input.sanctionId
    ? await db.operatorSanction.findFirst({
        where: { id: input.sanctionId, userId: input.userId },
      })
    : unrestored;

  const appeal = await db.accountAppeal.create({
    data: {
      userId: input.userId,
      accountStatusAtSubmit: dbUser.accountStatus,
      suspensionReasonSnapshot: dbUser.suspensionReason ?? sanction?.reason,
      kind: sanction?.kind === "CONTENT_REMOVE" ? "CONTENT" : "ACCOUNT",
      targetType: sanction?.targetType ?? null,
      targetId: sanction?.targetId ?? null,
      sanctionId: sanction?.id ?? null,
      title: input.title,
      content: input.content,
      contactEmail: input.contactEmail,
    },
  });

  await createNotification({
    userId: input.userId,
    type: "SYSTEM",
    title: "Appeal received",
    body: "We received your appeal and will review it.",
    link: `/appeal/${appeal.id}`,
  });
  return { success: true as const, appealId: appeal.id };
}
