import { after } from "next/server";
import { db } from "@/lib/db";
import { extractMentionUsernames } from "@/lib/mention-utils";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  actorId?: string;
};

/** 알림 대상 ≠ 행위자일 때만 생성 */
export async function createNotification(data: NotificationInput): Promise<void> {
  if (data.actorId && data.actorId === data.userId) return;
  try {
    await db.notification.create({
      data: {
        userId: data.userId,
        actorId: data.actorId,
        type: data.type,
        title: data.title,
        body: data.body,
        link: data.link,
      },
    });
    void import("@/lib/mobile-push")
      .then(({ deliverMobilePush }) =>
        deliverMobilePush({
          userId: data.userId,
          title: data.title,
          body: data.body || data.title,
          url: data.link,
          tag: `sns-${data.type}`,
          type: "sns_notification",
        })
      )
      .catch(() => undefined);
  } catch {
    /* 테이블 미적용 등 */
  }
}

export function scheduleNotification(data: NotificationInput): void {
  after(async () => {
    await createNotification(data);
  });
}

export async function createNotificationsMany(
  items: NotificationInput[]
): Promise<void> {
  const rows = items.filter(
    (n) => !n.actorId || n.actorId !== n.userId
  );
  if (rows.length === 0) return;
  try {
    await db.notification.createMany({
      data: rows.map((n) => ({
        userId: n.userId,
        actorId: n.actorId,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
      })),
    });
  } catch {
    /* ignore */
  }
}

type ActorInfo = { id: string; username: string | null };

async function getActor(actorId: string): Promise<ActorInfo | null> {
  return db.user.findUnique({
    where: { id: actorId },
    select: { id: true, username: true },
  });
}

function actorLabel(actor: ActorInfo | null, fallback = "누군가"): string {
  return actor?.username ? `@${actor.username}` : fallback;
}

export async function notifyPostLike(
  postId: string,
  authorId: string,
  actorId: string
) {
  if (authorId === actorId) return;
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: authorId,
    actorId,
    type: "like",
    title: "좋아요",
    body: `${actorLabel(actor)}님이 회원님의 게시물을 좋아합니다.`,
    link: `/post/${postId}`,
  });
}

export async function notifyPostRepost(
  postId: string,
  authorId: string,
  actorId: string
) {
  if (authorId === actorId) return;
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: authorId,
    actorId,
    type: "repost",
    title: "리포스트",
    body: `${actorLabel(actor)}님이 회원님의 게시물을 리포스트했습니다.`,
    link: `/post/${postId}`,
  });
}

export async function notifyPostComment(params: {
  postId: string;
  postAuthorId: string;
  commentId: string;
  actorId: string;
  parentCommentAuthorId?: string | null;
  content: string;
}) {
  const { postId, postAuthorId, actorId, parentCommentAuthorId, content } = params;
  const actor = await getActor(actorId);
  const label = actorLabel(actor);
  const link = `/post/${postId}#comment-${params.commentId}`;

  if (parentCommentAuthorId && parentCommentAuthorId !== actorId) {
    scheduleNotification({
      userId: parentCommentAuthorId,
      actorId,
      type: "comment_reply",
      title: "댓글 답글",
      body: `${label}님이 회원님의 댓글에 답글을 남겼습니다.`,
      link,
    });
  }

  if (postAuthorId !== actorId && postAuthorId !== parentCommentAuthorId) {
    scheduleNotification({
      userId: postAuthorId,
      actorId,
      type: "comment",
      title: "댓글",
      body: `${label}님이 회원님의 게시물에 댓글을 남겼습니다.`,
      link,
    });
  }

  await notifyMentionsInText({
    text: content,
    actorId,
    link,
    context: "댓글",
  });
}

export async function notifyCommentLiked(params: {
  postId: string;
  commentId: string;
  commentAuthorId: string;
  actorId: string;
  postAuthorId: string;
}) {
  const { postId, commentId, commentAuthorId, actorId, postAuthorId } = params;
  if (commentAuthorId === actorId) return;

  const actor = await getActor(actorId);
  const label = actorLabel(actor);
  const link = `/post/${postId}#comment-${commentId}`;
  const isAuthorLike = actorId === postAuthorId;

  scheduleNotification({
    userId: commentAuthorId,
    actorId,
    type: isAuthorLike ? "comment_author_like" : "comment_like",
    title: isAuthorLike ? "작성자 좋아요" : "댓글 좋아요",
    body: isAuthorLike
      ? `${label}님(작성자)이 회원님의 댓글을 좋아합니다.`
      : `${label}님이 회원님의 댓글을 좋아합니다.`,
    link,
  });
}

export async function notifyCommentPinned(params: {
  postId: string;
  commentId: string;
  commentAuthorId: string;
  actorId: string;
}) {
  const { postId, commentId, commentAuthorId, actorId } = params;
  if (commentAuthorId === actorId) return;

  const actor = await getActor(actorId);
  const label = actorLabel(actor);
  scheduleNotification({
    userId: commentAuthorId,
    actorId,
    type: "comment_pin",
    title: "댓글 고정",
    body: `${label}님이 회원님의 댓글을 고정했습니다.`,
    link: `/post/${postId}#comment-${commentId}`,
  });
}

export async function notifyMentionsInText(params: {
  text: string;
  actorId: string;
  link: string;
  context?: string;
  excludeUserIds?: string[];
}) {
  const usernames = extractMentionUsernames(params.text);
  if (usernames.length === 0) return;

  const users = await db.user.findMany({
    where: {
      username: { in: usernames, mode: "insensitive" },
    },
    select: { id: true, username: true },
  });

  const actor = await getActor(params.actorId);
  const label = actorLabel(actor);
  const exclude = new Set([params.actorId, ...(params.excludeUserIds ?? [])]);
  const ctx = params.context ?? "게시물";

  const items: NotificationInput[] = [];
  for (const u of users) {
    if (exclude.has(u.id)) continue;
    items.push({
      userId: u.id,
      actorId: params.actorId,
      type: "mention",
      title: "멘션",
      body: `${label}님이 ${ctx}에서 회원님을 언급했습니다.`,
      link: params.link,
    });
  }
  if (items.length > 0) {
    after(async () => {
      await createNotificationsMany(items);
    });
  }
}

export async function notifyFollow(targetUserId: string, actorId: string) {
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: targetUserId,
    actorId,
    type: "follow",
    title: "새 팔로워",
    body: `${actorLabel(actor)}님이 회원님을 팔로우하기 시작했습니다.`,
    link: actor?.username ? `/u/${actor.username}` : "/explore",
  });
}

export async function notifyDiscoveryLike(targetUserId: string, actorId: string) {
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: targetUserId,
    actorId,
    type: "discovery_like",
    title: "관심 표현",
    body: `${actorLabel(actor)}님이 회원님에게 관심을 보냈어요.`,
    link: "/discover/matches",
  });
}

export async function notifyDiscoveryCheer(targetUserId: string, actorId: string) {
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: targetUserId,
    actorId,
    type: "discovery_cheer",
    title: "응원 · 팔로우",
    body: `${actorLabel(actor)}님이 ㅊㅊ! · 팔로우했어요.`,
    link: actor?.username ? `/u/${actor.username}` : "/discover",
  });
}

export async function notifyDiscoveryMatch(targetUserId: string, actorId: string) {
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: targetUserId,
    actorId,
    type: "discovery_match",
    title: "매칭 성공!",
    body: `${actorLabel(actor)}님과 연결됐어요. 메시지를 보내보세요.`,
    link: "/discover/matches",
  });
}

export async function notifyPostVote(
  postId: string,
  authorId: string,
  actorId: string,
  voteType: "UP" | "DOWN"
) {
  if (authorId === actorId || voteType !== "UP") return;
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: authorId,
    actorId,
    type: "vote",
    title: "추천",
    body: `${actorLabel(actor)}님이 회원님의 게시물을 추천했습니다.`,
    link: `/post/${postId}`,
  });
}

export async function notifyNewPostMentions(
  postId: string,
  authorId: string,
  title: string | null | undefined,
  content: string
) {
  const text = [title, content].filter(Boolean).join("\n");
  await notifyMentionsInText({
    text,
    actorId: authorId,
    link: `/post/${postId}`,
    context: "게시물",
    excludeUserIds: [authorId],
  });
}

export async function notifyCommunityJoin(
  communityId: string,
  slug: string,
  creatorId: string,
  actorId: string
) {
  if (creatorId === actorId) return;
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: creatorId,
    actorId,
    type: "community_join",
    title: "커뮤니티 가입",
    body: `${actorLabel(actor)}님이 커뮤니티에 가입했습니다.`,
    link: `/c/${slug}/members`,
  });
}

export async function notifyJoinRequestPending(
  communityId: string,
  slug: string,
  requesterId: string,
  moderatorIds: string[]
) {
  const actor = await getActor(requesterId);
  const items = moderatorIds
    .filter((id) => id !== requesterId)
    .map((userId) => ({
      userId,
      actorId: requesterId,
      type: "community_join_request",
      title: "가입 요청",
      body: `${actorLabel(actor)}님이 가입을 요청했습니다.`,
      link: `/c/${slug}/settings`,
    }));
  if (items.length) await createNotificationsMany(items);
}

export async function notifyJoinApproved(slug: string, userId: string) {
  scheduleNotification({
    userId,
    type: "community_join_approved",
    title: "가입 승인",
    body: "커뮤니티 가입이 승인되었습니다. 이제 모든 기능을 이용할 수 있습니다.",
    link: `/c/${slug}`,
  });
}

export async function notifyJoinRejected(slug: string, userId: string) {
  scheduleNotification({
    userId,
    type: "community_join_rejected",
    title: "가입 거절",
    body: "커뮤니티 가입 요청이 거절되었습니다.",
    link: `/c/${slug}`,
  });
}

export async function notifyClipLike(
  clipId: string,
  authorId: string,
  actorId: string
) {
  if (authorId === actorId) return;
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: authorId,
    actorId,
    type: "clip_like",
    title: "클립 좋아요",
    body: `${actorLabel(actor)}님이 클립을 좋아합니다.`,
    link: "/live",
  });
}

export async function notifyClipComment(
  clipId: string,
  authorId: string,
  actorId: string
) {
  if (authorId === actorId) return;
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: authorId,
    actorId,
    type: "clip_comment",
    title: "클립 댓글",
    body: `${actorLabel(actor)}님이 클립에 댓글을 남겼습니다.`,
    link: "/live",
  });
}

export async function notifyIncomingCall(
  calleeId: string,
  callerId: string,
  callType: "AUDIO" | "VIDEO",
  callId: string,
  chatRoomId?: string | null
) {
  const caller = await getActor(callerId);
  const kind = callType === "VIDEO" ? "영상" : "음성";
  const label = actorLabel(caller);
  scheduleNotification({
    userId: calleeId,
    actorId: callerId,
    type: "call",
    title: "수신 통화",
    body: `${label}님의 ${kind} 통화`,
    link: `/?incomingCall=${callId}`,
  });
  after(async () => {
    const { sendIncomingCallPush } = await import("@/lib/web-push");
    await sendIncomingCallPush({
      calleeId,
      callerId,
      callId,
      callerName: label,
      callType,
      chatRoomId,
    });
  });
}

/** DM·그룹 채팅 메시지 — 발신자 제외 멤버에게 */
export async function notifyChatMessage(params: {
  roomId: string;
  senderId: string;
  content: string | null;
  roomType: string;
  mentionUserIds?: string[];
}) {
  const members = await db.chatMember.findMany({
    where: { roomId: params.roomId, userId: { not: params.senderId } },
    select: { userId: true },
  });
  if (members.length === 0) return;

  const sender = await db.user.findUnique({
    where: { id: params.senderId },
    select: userPublicSelectMinimal,
  });
  const label = sender?.username ? `@${sender.username}` : "새 메시지";
  const preview = (params.content ?? "").trim().slice(0, 80) || "미디어를 보냈습니다.";
  const link = `/messages/${params.roomId}`;
  const isDm = params.roomType === "DM";
  const type = isDm ? "dm" : "dm_group";

  const items: NotificationInput[] = members.map((m) => ({
    userId: m.userId,
    actorId: params.senderId,
    type,
    title: isDm ? "쪽지" : "그룹 메시지",
    body: `${label}: ${preview}`,
    link,
  }));

  await createNotificationsMany(items);

  if (params.mentionUserIds?.length) {
    for (const uid of params.mentionUserIds) {
      if (uid === params.senderId) continue;
      await createNotification({
        userId: uid,
        actorId: params.senderId,
        type: "mention",
        title: "멘션",
        body: `${label}님이 메시지에서 회원님을 언급했습니다.`,
        link,
      });
    }
  }
}

export async function notifyTip(
  receiverId: string,
  senderId: string,
  amount: number,
  receiverUsername: string | null
) {
  const sender = await getActor(senderId);
  await createNotification({
    userId: receiverId,
    actorId: senderId,
    type: "tip",
    title: "후원",
    body: `${actorLabel(sender)}님이 ${amount.toLocaleString()}원을 후원했습니다.`,
    link: receiverUsername ? `/u/${receiverUsername}` : "/support",
  });
}

export async function notifyEmoticonGift(
  receiverId: string,
  senderId: string,
  packName: string,
  creatorAmount: number
) {
  const sender = await getActor(senderId);
  await createNotification({
    userId: receiverId,
    actorId: senderId,
    type: "emoticon_gift",
    title: "이모티콘 선물",
    body: `${actorLabel(sender)}님이 「${packName}」을 보냈습니다. (+${creatorAmount.toLocaleString()}원)`,
    link: "/support?tab=gifts",
  });
}

export async function notifyGoodsOrder(
  sellerId: string,
  buyerName: string,
  total: number
) {
  await createNotification({
    userId: sellerId,
    type: "goods_order",
    title: "굿즈 주문",
    body: `${buyerName}님 주문 · ${total.toLocaleString()}원 결제 완료`,
    link: "/support",
  });
}

export async function notifyLiveStart(
  followerIds: string[],
  hostId: string,
  hostUsername: string,
  channelId: string,
  title: string
) {
  const body = `${hostUsername}님이 「${title.slice(0, 40)}」 방송을 시작했습니다.`;
  const link = `/voice/${channelId}`;
  const rows: NotificationInput[] = followerIds
    .filter((id) => id !== hostId)
    .map((userId) => ({
      userId,
      actorId: hostId,
      type: "live",
      title: "라이브 시작",
      body,
      link,
    }));
  await createNotificationsMany(rows);
}

export async function notifyPostCollabInvite(
  postId: string,
  inviterId: string,
  inviteeId: string,
  postTitle?: string | null
) {
  if (inviterId === inviteeId) return;
  const actor = await getActor(inviterId);
  const snippet = postTitle?.trim() ? ` «${postTitle.trim().slice(0, 40)}»` : "";
  scheduleNotification({
    userId: inviteeId,
    actorId: inviterId,
    type: "post_collab_invite",
    title: "공동작업 초대",
    body: `${actorLabel(actor)}님이 회원님을 공동작업자로 초대했습니다.${snippet}`,
    link: `/post/${postId}?collab=1`,
  });
  // Email hook (optional): wire when SNS email prefs exist.
}

export async function notifyPostCollabAccepted(
  postId: string,
  authorId: string,
  collaboratorId: string,
  postTitle?: string | null
) {
  if (authorId === collaboratorId) return;
  const actor = await getActor(collaboratorId);
  const snippet = postTitle?.trim() ? ` «${postTitle.trim().slice(0, 40)}»` : "";
  scheduleNotification({
    userId: authorId,
    actorId: collaboratorId,
    type: "post_collab_accepted",
    title: "공동작업 수락",
    body: `${actorLabel(actor)}님이 공동작업 초대를 수락했습니다.${snippet}`,
    link: `/post/${postId}`,
  });
}

export const NOTIFICATION_CATEGORIES = {
  social: [
    "like",
    "comment",
    "comment_reply",
    "comment_like",
    "comment_author_like",
    "comment_pin",
    "mention",
    "repost",
    "follow",
    "vote",
    "post_collab_invite",
    "post_collab_accepted",
  ],
  messages: ["dm", "dm_group", "mention", "call"],
  commerce: ["tip", "emoticon_gift", "goods_order"],
  market: ["used_auction_bid", "used_auction_outbid", "used_auction_won", "used_auction_ended", "used_auction_buy_now"],
  live: ["live", "clip_like", "clip_comment"],
  community: ["community_join"],
} as const;

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;
