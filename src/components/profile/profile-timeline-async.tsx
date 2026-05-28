import { getProfileHeader, getProfileTimeline } from "@/actions/profile-page";
import { getViewerPlatformSupport } from "@/actions/support";
import { PlatformSupportCard } from "@/components/support/platform-support-card";
import { parseProfileTab } from "@/lib/profile-queries";
import { ProfileTimeline, type TimelineItem } from "@/components/profile/profile-timeline";

const emptyMessages: Record<string, string> = {
  posts: "아직 게시물이 없습니다.",
  replies: "아직 남긴 답글이 없습니다.",
  media: "미디어가 포함된 게시물이 없습니다.",
  likes: "좋아요한 게시물이 없습니다.",
};

/** 타임라인 우선 로드 — 후원 블록보다 먼저 표시 */
export async function ProfileTimelineAsync({
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

  const [platformSupport, timeline] = await Promise.all([
    header.isSelf ? getViewerPlatformSupport() : Promise.resolve(null),
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
