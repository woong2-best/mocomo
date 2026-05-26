import { getProfileHeader } from "@/actions/profile-page";
import { getProfileTimeline } from "@/actions/profile-page";
import {
  getCreatorSupportSummary,
  getViewerPlatformSupport,
  getViewerSupportForCreator,
} from "@/actions/support";
import { PlatformSupportCard } from "@/components/support/platform-support-card";
import { ProfileSupportBlock } from "@/components/support/profile-support-block";
import { parseProfileTab } from "@/lib/profile-queries";
import { ProfileTimeline, type TimelineItem } from "@/components/profile/profile-timeline";

const emptyMessages: Record<string, string> = {
  posts: "아직 게시물이 없습니다.",
  replies: "아직 남긴 답글이 없습니다.",
  media: "미디어가 포함된 게시물이 없습니다.",
  likes: "좋아요한 게시물이 없습니다.",
};

export async function ProfileBodyAsync({
  username,
  tabParam,
}: {
  username: string;
  tabParam?: string;
}) {
  const header = await getProfileHeader(username);
  if (!header) return null;

  const tab = parseProfileTab(tabParam);
  const effectiveTab = tab === "likes" && !header.isSelf ? "posts" : tab;

  const [supportSummary, viewerSupport, platformSupport, timeline] = await Promise.all([
    getCreatorSupportSummary(header.user.id),
    getViewerSupportForCreator(header.user.id),
    getViewerPlatformSupport(),
    getProfileTimeline(header.user.id, effectiveTab),
  ]);

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

      <ProfileSupportBlock
        creatorId={header.user.id}
        username={header.user.username}
        displayName={header.user.name || header.user.username}
        isSelf={header.isSelf}
        summary={supportSummary}
        viewerSupport={viewerSupport}
        profileReceivedTotal={header.user.totalSupportReceived}
        profileReceivedTier={header.user.supportTierReceived}
      />

      <ProfileTimeline
        username={username}
        tab={effectiveTab}
        initialItems={initialItems}
        initialCursor={nextCursor}
        emptyMessage={emptyMessages[effectiveTab]}
      />
    </>
  );
}
