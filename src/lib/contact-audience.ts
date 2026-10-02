import type { ContactAudience } from "@prisma/client";
import { db } from "@/lib/db";
import {
  CALL_NOT_ALLOWED,
  CALL_REQUEST_BLOCKED,
  MESSAGE_NOT_ALLOWED,
  MESSAGE_REQUEST_BLOCKED,
} from "@/lib/contact-audience-copy";
import { areUsersBlocked, getBlockedUserIdSet, USER_BLOCK_INTERACTION_ERROR } from "@/lib/user-block";

export type ContactAudienceValue = ContactAudience;

export type ContactSettings = {
  messageRequestAudience: ContactAudience;
  callRequestAudience: ContactAudience;
};

const DEFAULT_SETTINGS: ContactSettings = {
  messageRequestAudience: "EVERYONE",
  callRequestAudience: "EVERYONE",
};

export async function getContactSettings(userId: string): Promise<ContactSettings> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      messageRequestAudience: true,
      callRequestAudience: true,
    },
  });
  if (!user) return DEFAULT_SETTINGS;
  return {
    messageRequestAudience: user.messageRequestAudience,
    callRequestAudience: user.callRequestAudience,
  };
}

export async function saveContactSettings(
  userId: string,
  patch: Partial<ContactSettings>
): Promise<ContactSettings> {
  const data: Partial<ContactSettings> = {};
  if (patch.messageRequestAudience) data.messageRequestAudience = patch.messageRequestAudience;
  if (patch.callRequestAudience) data.callRequestAudience = patch.callRequestAudience;
  if (Object.keys(data).length === 0) return getContactSettings(userId);

  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: {
      messageRequestAudience: true,
      callRequestAudience: true,
    },
  });
  return updated;
}

/**
 * Recipient allows actor to start a DM or call.
 * FOLLOWING_ONLY: only accounts the recipient follows (followerId = recipient).
 */
export async function incomingContactDecision(
  actorId: string,
  recipientId: string,
  kind: "message" | "call"
): Promise<{ allowed: true } | { allowed: false; error: string; code: string }> {
  if (actorId === recipientId) {
    return {
      allowed: false,
      code: kind === "call" ? CALL_NOT_ALLOWED : MESSAGE_NOT_ALLOWED,
      error: kind === "call" ? "자기 자신에게는 전화할 수 없습니다." : "You can't DM yourself.",
    };
  }

  if (await areUsersBlocked(actorId, recipientId)) {
    return {
      allowed: false,
      code: kind === "call" ? CALL_NOT_ALLOWED : MESSAGE_NOT_ALLOWED,
      error: USER_BLOCK_INTERACTION_ERROR,
    };
  }

  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: {
      messageRequestAudience: true,
      callRequestAudience: true,
      deletedAt: true,
    },
  });
  if (!recipient || recipient.deletedAt) {
    return {
      allowed: false,
      code: kind === "call" ? CALL_NOT_ALLOWED : MESSAGE_NOT_ALLOWED,
      error: "User not found.",
    };
  }

  const audience =
    kind === "message" ? recipient.messageRequestAudience : recipient.callRequestAudience;
  if (audience !== "FOLLOWING_ONLY") return { allowed: true };

  const follow = await db.follow.findUnique({
    where: {
      followerId_followingId: { followerId: recipientId, followingId: actorId },
    },
    select: { id: true },
  });
  if (follow) return { allowed: true };

  return {
    allowed: false,
    code: kind === "call" ? CALL_NOT_ALLOWED : MESSAGE_NOT_ALLOWED,
    error: kind === "call" ? CALL_REQUEST_BLOCKED : MESSAGE_REQUEST_BLOCKED,
  };
}

export async function contactPermissions(actorId: string, recipientId: string) {
  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: {
      messageRequestAudience: true,
      callRequestAudience: true,
      deletedAt: true,
    },
  });
  if (!recipient || recipient.deletedAt || actorId === recipientId) {
    return { canMessage: false, canCall: false };
  }

  if (await areUsersBlocked(actorId, recipientId)) {
    return { canMessage: false, canCall: false };
  }

  const needsFollow =
    recipient.messageRequestAudience === "FOLLOWING_ONLY" ||
    recipient.callRequestAudience === "FOLLOWING_ONLY";
  const followsActor = needsFollow
    ? !!(await db.follow.findUnique({
        where: {
          followerId_followingId: { followerId: recipientId, followingId: actorId },
        },
        select: { id: true },
      }))
    : true;

  return {
    canMessage: recipient.messageRequestAudience !== "FOLLOWING_ONLY" || followsActor,
    canCall: recipient.callRequestAudience !== "FOLLOWING_ONLY" || followsActor,
  };
}

/** Ids the actor may start a new DM with. Missing users are omitted. */
export async function messageAllowedIds(actorId: string, recipientIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(recipientIds.filter(Boolean))];
  if (ids.length === 0) return new Set();

  const blocked = await getBlockedUserIdSet(actorId);

  const [users, follows] = await Promise.all([
    db.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, messageRequestAudience: true },
    }),
    db.follow.findMany({
      where: { followingId: actorId, followerId: { in: ids } },
      select: { followerId: true },
    }),
  ]);
  const followedBy = new Set(follows.map((row) => row.followerId));
  const allowed = new Set<string>();
  for (const user of users) {
    if (user.id === actorId) continue;
    if (blocked.has(user.id)) continue;
    if (user.messageRequestAudience !== "FOLLOWING_ONLY" || followedBy.has(user.id)) {
      allowed.add(user.id);
    }
  }
  return allowed;
}

export async function annotateCanMessage<T extends { id: string }>(
  actorId: string,
  users: T[]
): Promise<(T & { canMessage: boolean })[]> {
  const allowed = await messageAllowedIds(
    actorId,
    users.map((user) => user.id)
  );
  return users.map((user) => ({ ...user, canMessage: allowed.has(user.id) }));
}

/** Block a send inside an existing 1:1 DM when the other person does not allow it. */
export async function dmSendBlockReason(senderId: string, roomId: string): Promise<string | null> {
  const members = await db.chatMember.findMany({
    where: { roomId },
    select: { userId: true },
  });
  const otherId = members.find((member) => member.userId !== senderId)?.userId;
  if (!otherId) return null;
  const decision = await incomingContactDecision(senderId, otherId, "message");
  if (decision.allowed) return null;
  return decision.code;
}
