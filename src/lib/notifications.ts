import { after } from "next/server";
import { db } from "@/lib/db";
import { extractMentionUsernames } from "@/lib/mention-utils";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import { formatUsd } from "@/lib/money";
import {
  buildPostInteractionPushData,
  extractPostIdFromLink,
  isPostInteractionPush,
} from "@/lib/post-push-enrich";
import { isAppAlarmType } from "@/lib/app-alarm";
import { displayableImageUrl } from "@/lib/displayable-image-url";

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  actorId?: string;
  pushData?: Record<string, string>;
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
      .then(async ({ deliverMobilePush }) => {
        const pushType = data.type === "call" ? "incoming_call" : data.type;
        let pushData = data.pushData;

        if (isPostInteractionPush(data.type, data.link)) {
          const postId = extractPostIdFromLink(data.link);
          if (postId) {
            pushData = {
              ...(pushData ?? {}),
              ...(await buildPostInteractionPushData({
                postId,
                actorId: data.actorId,
                body: data.body,
              })),
            };
          }
        }

        if (data.type !== "call" && !isAppAlarmType(data.type)) return;
        const callId = data.pushData?.callId;
        return deliverMobilePush({
          userId: data.userId,
          title: data.title,
          body: data.body || data.title,
          url: data.link,
          tag: data.type === "call" && callId ? `call-${callId}` : `sns-${data.type}`,
          type: pushType,
          data: pushData,
        });
      })
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

function actorLabel(actor: ActorInfo | null, fallback = "Someone"): string {
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
    title: "Like",
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
    title: "Repost",
    body: `${actorLabel(actor)}님이 회원님의 게시물을 재게시했습니다.`,
    link: `/post/${postId}`,
  });
}

const QUOTED_POST_ID = /\/post\/([A-Za-z0-9_-]{8,})/g;

export function extractQuotedPostIds(content: string, excludeId?: string): string[] {
  const ids = new Set<string>();
  for (const match of content.matchAll(QUOTED_POST_ID)) {
    const id = match[1];
    if (!id || id === excludeId) continue;
    ids.add(id);
    if (ids.size >= 3) break;
  }
  return [...ids];
}

/** 인용 게시 — 본문의 원문 게시물 작성자에게 알림 */
export async function notifyQuotedPosts(params: {
  content: string;
  actorId: string;
  quotePostId: string;
  quotedPostId?: string | null;
}) {
  const ids = extractQuotedPostIds(params.content, params.quotePostId);
  if (params.quotedPostId && params.quotedPostId !== params.quotePostId) {
    ids.unshift(params.quotedPostId);
  }
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const posts = await db.post.findMany({
    where: { id: { in: unique } },
    select: { id: true, authorId: true },
  });
  const actor = await getActor(params.actorId);
  for (const post of posts) {
    if (post.authorId === params.actorId) continue;
    scheduleNotification({
      userId: post.authorId,
      actorId: params.actorId,
      type: "quote",
      title: "Quote",
      body: `${actorLabel(actor)}님이 회원님의 게시물을 인용했습니다.`,
      link: `/post/${params.quotePostId}`,
    });
  }
}

export async function notifyListingLiked(params: {
  listingId: string;
  sellerId: string;
  actorId: string;
  title: string;
}) {
  if (params.sellerId === params.actorId) return;
  const actor = await getActor(params.actorId);
  const name = params.title.trim().slice(0, 40) || "Listing";
  scheduleNotification({
    userId: params.sellerId,
    actorId: params.actorId,
    type: "listing_like",
    title: "Listing favorite",
    body: `${actorLabel(actor)}님이 「${name}」에 맘찍을 남겼습니다.`,
    link: `/market/${params.listingId}`,
  });
}

export async function notifyPostComment(params: {
  postId: string;
  postAuthorId: string;
  commentId: string;
  actorId: string;
  parentCommentAuthorId?: string | null;
  content: string;
  /** 익명 게시물 댓글 알림만 작성자 숨김 (QnA 답글은 공개). */
  anonymous?: boolean;
}) {
  const { postId, postAuthorId, actorId, parentCommentAuthorId, content } = params;
  const postMeta = await db.post.findUnique({
    where: { id: postId },
    select: { isAnonymous: true, communityId: true },
  });
  const isQnaAnswer = Boolean(postMeta?.communityId && postMeta.isAnonymous);
  const hideActor = Boolean(params.anonymous) && !isQnaAnswer;
  const actor = hideActor ? null : await getActor(actorId);
  const label = hideActor ? "익명" : actorLabel(actor);
  const link = `/post/${postId}#comment-${params.commentId}`;
  const actorForRow = hideActor ? undefined : actorId;

  if (parentCommentAuthorId && parentCommentAuthorId !== actorId) {
    scheduleNotification({
      userId: parentCommentAuthorId,
      actorId: actorForRow,
      type: "comment_reply",
      title: "Comment reply",
      body: `${label}님이 회원님의 댓글에 답글을 남겼습니다.`,
      link,
    });
  }

  if (postAuthorId !== actorId && postAuthorId !== parentCommentAuthorId) {
    scheduleNotification({
      userId: postAuthorId,
      actorId: actorForRow,
      type: isQnaAnswer ? "qna_answer" : "comment",
      title: isQnaAnswer ? "QnA 답변" : "Comment",
      body: isQnaAnswer
        ? `${label}님이 회원님의 질문에 답변을 남겼습니다.`
        : `${label}님이 회원님의 게시물에 댓글을 남겼습니다.`,
      link,
    });
  }

  if (!params.anonymous) {
    await notifyMentionsInText({
      text: content,
      actorId,
      link,
      context: "Comment",
    });
  }
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
    title: isAuthorLike ? "작성자 좋아요" : "Comment like",
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
    title: "Pinned comment",
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
  const ctx = params.context ?? "Post";

  const items: NotificationInput[] = [];
  for (const u of users) {
    if (exclude.has(u.id)) continue;
    items.push({
      userId: u.id,
      actorId: params.actorId,
      type: "mention",
      title: "Mention",
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
    title: "New follower",
    body: `${actorLabel(actor)}님이 회원님을 팔로우하기 시작했습니다.`,
    link: actor?.username ? `/u/${actor.username}` : "/explore",
  });
}

export async function notifyFollowRequest(targetUserId: string, actorId: string) {
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: targetUserId,
    actorId,
    type: "follow_request",
    title: "Follow request",
    body: `${actorLabel(actor)}님이 팔로우를 요청했습니다.`,
    link: "/settings?tab=follow-requests",
  });
}

export async function notifyFollowRequestAccepted(requesterId: string, targetId: string) {
  const target = await getActor(targetId);
  scheduleNotification({
    userId: requesterId,
    actorId: targetId,
    type: "follow_accepted",
    title: "Follow accepted",
    body: `${actorLabel(target)}님이 팔로우 요청을 수락했습니다.`,
    link: target?.username ? `/u/${target.username}` : "/explore",
  });
}

export async function notifyDiscoveryLike(targetUserId: string, actorId: string) {
  const actor = await getActor(actorId);
  scheduleNotification({
    userId: targetUserId,
    actorId,
    type: "discovery_like",
    title: "Interest",
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
    title: "Cheer · follow",
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
    title: "Match!",
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
    title: "Featured",
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
    context: "Post",
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
    title: "Community join",
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
      title: "Join request",
      body: `${actorLabel(actor)}님이 가입을 요청했습니다.`,
      link: `/c/${slug}/settings`,
    }));
  if (items.length) await createNotificationsMany(items);
}

export async function notifyJoinApproved(slug: string, userId: string) {
  scheduleNotification({
    userId,
    type: "community_join_approved",
    title: "Join approved",
    body: "Your community join request was approved. You can use all features now.",
    link: `/c/${slug}`,
  });
}

export async function notifyJoinRejected(slug: string, userId: string) {
  scheduleNotification({
    userId,
    type: "community_join_rejected",
    title: "Join declined",
    body: "Your community join request was declined.",
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
    title: "Clip like",
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
    title: "Clip comment",
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
  const kind = callType === "VIDEO" ? "Video" : "Voice";
  const label = actorLabel(caller);
  scheduleNotification({
    userId: calleeId,
    actorId: callerId,
    type: "call",
    title: "Incoming call",
    body: `${label}님의 ${kind} 통화`,
    link: `/?incomingCall=${callId}`,
    pushData: {
      callId,
      callType,
      callerId,
      ...(chatRoomId ? { chatRoomId } : {}),
    },
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
  if (params.roomType === "FANDOM" || params.roomType === "PUBLIC") return;

  const communityChannel = await db.communityChannel.findFirst({
    where: { chatRoomId: params.roomId },
    select: { id: true },
  });
  if (communityChannel) return;

  const members = await db.chatMember.findMany({
    where: { roomId: params.roomId, userId: { not: params.senderId } },
    select: { userId: true },
  });
  if (members.length === 0) return;

  const sender = await db.user.findUnique({
    where: { id: params.senderId },
    select: userPublicSelectMinimal,
  });
  const label = sender?.username ? `@${sender.username}` : "New message";
  const preview = (params.content ?? "").trim().slice(0, 80) || "Sent media.";
  const link = `/messages/${params.roomId}`;
  const isDm = params.roomType === "DM";
  const type = isDm ? "dm" : "dm_group";

  const items: NotificationInput[] = members.map((m) => ({
    userId: m.userId,
    actorId: params.senderId,
    type,
    title: isDm ? "Direct message" : "Group message",
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
        title: "Mention",
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
  receiverUsername: string | null,
  opts?: { message?: string | null; channelId?: string | null }
) {
  const sender = await getActor(senderId);
  let body = `${actorLabel(sender)}님이 ${formatUsd(amount)}을 후원했습니다.`;
  const trimmedMsg = opts?.message?.trim();
  if (trimmedMsg) {
    body += ` «${trimmedMsg.slice(0, 80)}»`;
  }
  const link = opts?.channelId
    ? `/voice/${opts.channelId}`
    : receiverUsername
      ? `/u/${receiverUsername}`
      : "/support";
  await createNotification({
    userId: receiverId,
    actorId: senderId,
    type: "tip",
    title: "Tip",
    body,
    link,
  });
}

const LIVE_CHEER_TYPE_LABEL: Record<string, string> = {
  GENERAL: "Cheer",
  TTS: "TTS",
  ROULETTE: "Roulette",
  SOUND: "Sound effect",
  VOTE: "Poll",
};

export async function notifyLiveCheer(
  receiverId: string,
  senderId: string,
  amount: number,
  channelId: string,
  opts?: { message?: string | null; eventType?: string; rouletteLabel?: string }
) {
  const sender = await getActor(senderId);
  const typeLabel = LIVE_CHEER_TYPE_LABEL[opts?.eventType ?? ""] ?? "CP";
  let body = `${actorLabel(sender)}님이 ${amount.toLocaleString()} CP ${typeLabel}`;
  if (opts?.eventType === "ROULETTE" && opts.rouletteLabel) {
    body += ` · ${opts.rouletteLabel}`;
  }
  const trimmedMsg = opts?.message?.trim();
  if (trimmedMsg) {
    body += ` «${trimmedMsg.slice(0, 80)}»`;
  }
  await createNotification({
    userId: receiverId,
    actorId: senderId,
    type: "live_cheer",
    title: "Live tip",
    body,
    link: `/voice/${channelId}`,
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
    title: "Emote gift",
    body: `${actorLabel(sender)}님이 「${packName}」을 보냈습니다. (+${formatUsd(creatorAmount)})`,
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
    title: "Merch order",
    body: `${buyerName}님 주문 · ${formatUsd(total)} 결제 완료`,
    link: "/support",
  });
}

/** FCM downloads this URL itself, so it must be a public https address. */
function livePushImageUrl(image: string | null | undefined): string | undefined {
  const displayable = displayableImageUrl(image);
  if (!displayable) return undefined;
  if (displayable.startsWith("https://")) return displayable;
  if (!displayable.startsWith("/")) return undefined;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://mocomo.net").replace(/\/$/, "");
  return `${base}${displayable}`;
}

export async function notifyLiveStart(
  followerIds: string[],
  hostId: string,
  hostUsername: string,
  channelId: string,
  title: string
) {
  const host = await db.user.findUnique({
    where: { id: hostId },
    select: { name: true, username: true, image: true },
  });
  const nickname = host?.name?.trim() || host?.username?.trim() || hostUsername;
  const broadcastTitle = title.replace(/\s+/g, " ").trim().slice(0, 120);
  const link = `/voice/${channelId}`;
  const imageUrl = livePushImageUrl(host?.image);
  const rows: NotificationInput[] = followerIds
    .filter((id) => id !== hostId)
    .map((userId) => ({
      userId,
      actorId: hostId,
      type: "live",
      title: nickname,
      body: broadcastTitle,
      link,
    }));
  await createNotificationsMany(rows);
  await Promise.all(
    rows.map((row) =>
      import("@/lib/mobile-push")
        .then(({ deliverMobilePush }) =>
          deliverMobilePush({
            userId: row.userId,
            title: nickname,
            body: broadcastTitle,
            url: link,
            tag: `live-${channelId}`,
            type: "live",
            data: imageUrl ? { imageUrl } : undefined,
          })
        )
        .catch(() => undefined)
    )
  );
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
    title: "Collaboration invite",
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
    title: "Collaboration accepted",
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
    "quote",
    "qna_answer",
    "listing_like",
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
