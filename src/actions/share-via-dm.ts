"use server";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getOrCreateDM, sendMessage } from "@/actions/chat";
import { encodePostShareMessage } from "@/lib/chat-post-share";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import type { DmUserSearchHit } from "@/lib/dm-user-search";
import { annotateCanMessage } from "@/lib/contact-audience";
import { MESSAGE_REQUEST_BLOCKED } from "@/lib/contact-audience-copy";

const MAX_RECIPIENTS = 10;
const MAX_NOTE_LEN = 1000;
const MAX_SHARE_LEN = 2000;
const RECENT_LIMIT = 30;

export type ShareViaDmResult =
  | { ok: true; roomId: string; sentCount: number }
  | { ok: false; error: string };

/** Recent DM partners for the share-to-message picker (Twitter-style empty state). */
export async function listRecentDmPartners(): Promise<DmUserSearchHit[]> {
  const user = await requireAuth();

  const rooms = await db.chatRoom.findMany({
    where: {
      type: "DM",
      communityId: null,
      members: { some: { userId: user.id } },
    },
    take: RECENT_LIMIT,
    orderBy: { updatedAt: "desc" },
    include: {
      members: {
        where: { userId: { not: user.id } },
        take: 1,
        include: {
          user: {
            select: { ...userPublicSelectMinimal, name: true },
          },
        },
      },
    },
  });

  const followingIds = new Set(
    (
      await db.follow.findMany({
        where: {
          followerId: user.id,
          followingId: {
            in: rooms
              .map((r) => r.members[0]?.user.id)
              .filter((id): id is string => Boolean(id)),
          },
        },
        select: { followingId: true },
      })
    ).map((f) => f.followingId)
  );

  const seen = new Set<string>();
  const hits: Omit<DmUserSearchHit, "canMessage">[] = [];
  for (const room of rooms) {
    const other = room.members[0]?.user;
    if (!other || seen.has(other.id) || other.id === user.id) continue;
    seen.add(other.id);
    hits.push({
      id: other.id,
      username: other.username,
      name: other.name ?? null,
      image: other.image,
      supportTierSent: other.supportTierSent,
      isFollowing: followingIds.has(other.id),
    });
  }
  return annotateCanMessage(user.id, hits);
}

/**
 * Share content to one or more DMs (Twitter "Send via DM" behavior).
 * Sends optional note + shared payload as a single message per recipient.
 */
export async function shareContentViaDm(data: {
  recipientIds: string[];
  shareMessage?: string;
  postId?: string;
  note?: string;
}): Promise<ShareViaDmResult> {
  await requireAuth({ writeKind: "dm" });

  const uniqueIds = [...new Set(data.recipientIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: false, error: "actions.s9il86a" };
  }
  if (uniqueIds.length > MAX_RECIPIENTS) {
    return { ok: false, error: t("actions.s6xjtg", { v0: MAX_RECIPIENTS }) };
  }

  const note = (data.note ?? "").trim().slice(0, MAX_NOTE_LEN);
  const postId = data.postId?.trim();

  let content: string;
  if (postId) {
    if (postId.length > 40 || !/^[a-z0-9]+$/i.test(postId)) {
      return { ok: false, error: "actions.s7lym4y" };
    }
    const exists = await db.post.findFirst({
      where: { id: postId, visibility: "PUBLIC" },
      select: { id: true },
    });
    if (!exists) {
      return { ok: false, error: "actions.sgr97ft" };
    }
    content = encodePostShareMessage(postId, note);
  } else {
    const shareMessage = (data.shareMessage ?? "").trim().slice(0, MAX_SHARE_LEN);
    if (!shareMessage) {
      return { ok: false, error: "actions.suugoyf" };
    }
    content = note ? `${note}\n\n${shareMessage}` : shareMessage;
  }

  let firstRoomId: string | null = null;
  let sentCount = 0;
  const errors: string[] = [];

  for (const recipientId of uniqueIds) {
    const dm = await getOrCreateDM(recipientId);
    if ("error" in dm && dm.error) {
      errors.push(dm.error);
      continue;
    }
    if (!("room" in dm) || !dm.room) {
      errors.push("actions.strs82f");
      continue;
    }
    try {
      await sendMessage({ roomId: dm.room.id, content });
      sentCount += 1;
      if (!firstRoomId) firstRoomId = dm.room.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      errors.push(msg === MESSAGE_REQUEST_BLOCKED ? msg : "actions.s1ubqmdo");
    }
  }

  if (sentCount === 0 || !firstRoomId) {
    return {
      ok: false,
      error: errors[0] ?? "actions.s1ubqmdo",
    };
  }

  return { ok: true, roomId: firstRoomId, sentCount };
}
