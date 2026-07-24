"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getOrCreateDM, sendMessage } from "@/actions/chat";
import { encodePostShareMessage } from "@/lib/chat-post-share";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import type { DmUserSearchHit } from "@/lib/dm-user-search";

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
  const hits: DmUserSearchHit[] = [];
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
  return hits;
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
    return { ok: false, error: "받는 사람을 선택해 주세요." };
  }
  if (uniqueIds.length > MAX_RECIPIENTS) {
    return { ok: false, error: `한 번에 최대 ${MAX_RECIPIENTS}명까지 보낼 수 있습니다.` };
  }

  const note = (data.note ?? "").trim().slice(0, MAX_NOTE_LEN);
  const postId = data.postId?.trim();

  let content: string;
  if (postId) {
    if (postId.length > 40 || !/^[a-z0-9]+$/i.test(postId)) {
      return { ok: false, error: "잘못된 게시물입니다." };
    }
    const exists = await db.post.findFirst({
      where: { id: postId, visibility: "PUBLIC" },
      select: { id: true },
    });
    if (!exists) {
      return { ok: false, error: "게시물을 찾을 수 없습니다." };
    }
    content = encodePostShareMessage(postId, note);
  } else {
    const shareMessage = (data.shareMessage ?? "").trim().slice(0, MAX_SHARE_LEN);
    if (!shareMessage) {
      return { ok: false, error: "공유할 내용이 없습니다." };
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
      errors.push("대화를 열 수 없습니다.");
      continue;
    }
    try {
      await sendMessage({ roomId: dm.room.id, content });
      sentCount += 1;
      if (!firstRoomId) firstRoomId = dm.room.id;
    } catch {
      errors.push("메시지 전송에 실패했습니다.");
    }
  }

  if (sentCount === 0 || !firstRoomId) {
    return {
      ok: false,
      error: errors[0] ?? "메시지 전송에 실패했습니다.",
    };
  }

  return { ok: true, roomId: firstRoomId, sentCount };
}
