import {
  getProfileHeader,
  getProfileTimeline,
  getViewerCreatorSubscription,
} from "@/actions/profile-page";
import { creatorSubscriptionPriceForUser } from "@/lib/creator-subscription";
import { getViewerPlatformSupport } from "@/actions/support";
import { isPaymentsConfigured } from "@/lib/payments";
import { PlatformSupportCard } from "@/components/support/platform-support-card";
import { ProfileWikiContributions } from "@/components/profile/profile-wiki-contributions";
import { parseProfileMediaKind, parseProfileSort, parseProfileTab } from "@/lib/profile-queries";
import { ProfileTimeline, type TimelineItem } from "@/components/profile/profile-timeline";

const emptyMessages: Record<string, string> = {
  posts: "아직 게시물이 없습니다.",
  replies: "아직 남긴 답글이 없습니다.",
  media: "미디어가 포함된 게시물이 없습니다.",
  likes: "좋아요한 게시물이 없습니다.",
  wiki: "위키 기여가 없습니다.",
};

/** 타임라인 우선 로드 — 후원 블록보다 먼저 표시 */
export async function ProfileTimelineAsync({
  username,
  tabParam,
  sortParam,
  kindParam,
}: {
  username: string;
  tabParam?: string;
  sortParam?: string;
  kindParam?: string;
}) {
  const header = await getProfileHeader(username);
  if (!header) return null;

  const tab = parseProfileTab(tabParam);
  const effectiveTab = tab === "likes" && !header.isSelf ? "posts" : tab;
  const sort = parseProfileSort(sortParam);
  const mediaKind = parseProfileMediaKind(kindParam);

  const platformSupport = header.isSelf ? await getViewerPlatformSupport() : null;
  const paymentsEnabled = isPaymentsConfigured();
  const subscriptionPriceKrw = creatorSubscriptionPriceForUser(header.user.creatorSubscriptionPriceKrw);
  const profileBlocked =
    !header.isSelf &&
    (header.relationship.blockedByViewer || header.relationship.blockedViewer);
  const blockedEmptyMessage = header.relationship.blockedByViewer
    ? `@${header.user.username} 님을 차단했습니다. 게시물을 볼 수 없습니다.`
    : `@${header.user.username} 님이 회원님을 차단했습니다.`;

  if (effectiveTab === "wiki") {
    const viewerSub = header.isSelf
      ? { subscribed: false as const }
      : await getViewerCreatorSubscription(header.user.id);
    return (
      <>
        {header.isSelf && platformSupport && (
          <PlatformSupportCard
            sentTotal={platformSupport.sent.total}
            sentTier={platformSupport.sent.tier}
            receivedTotal={platformSupport.received.total}
            receivedTier={platformSupport.received.tier}
          />
        )}
        <ProfileWikiContributions userId={header.user.id} />
      </>
    );
  }

  const [viewerSub, timeline] = await Promise.all([
    header.isSelf
      ? Promise.resolve({ subscribed: false as const })
      : getViewerCreatorSubscription(header.user.id),
    profileBlocked
      ? Promise.resolve({ items: [], nextCursor: null })
      : getProfileTimeline(header.user.id, effectiveTab, header.author, undefined, {
          sort,
          mediaKind: effectiveTab === "media" ? mediaKind ?? "photo" : null,
        }),
  ]);
  const subscribed = "subscribed" in viewerSub ? viewerSub.subscribed : false;

  const { items, nextCursor } = timeline;

  const initialItems: TimelineItem[] = items.map((item) => {
    if (item.type === "post") {
      return {
        type: "post" as const,
        post: { ...item.post, createdAt: item.post.createdAt.toISOString() },
      };
    }
    if (item.type === "reply") {
      return {
        type: "reply" as const,
        comment: { ...item.comment, createdAt: item.comment.createdAt.toISOString() },
        post: { ...item.post, createdAt: item.post.createdAt.toISOString() },
      };
    }
    return {
      type: "like" as const,
      post: { ...item.post, createdAt: item.post.createdAt.toISOString() },
    };
  });

  return (
    <>
      {header.isSelf && platformSupport && (
        <PlatformSupportCard
          sentTotal={platformSupport.sent.total}
          sentTier={platformSupport.sent.tier}
          receivedTotal={platformSupport.received.total}
          receivedTier={platformSupport.received.tier}
        />
      )}

      <ProfileTimeline
        username={username}
        tab={effectiveTab}
        sort={sort}
        mediaKind={effectiveTab === "media" ? mediaKind ?? "photo" : null}
        initialItems={initialItems}
        initialCursor={nextCursor}
        emptyMessage={profileBlocked ? blockedEmptyMessage : emptyMessages[effectiveTab]}
        isSelf={header.isSelf}
        paymentsEnabled={paymentsEnabled}
        authorId={header.user.id}
        subscriptionPriceKrw={subscriptionPriceKrw}
        subscribed={subscribed}
      />
    </>
  );
}
