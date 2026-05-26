import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isPaymentsConfigured } from "@/lib/payments";
import { getProfileHeader, getProfileTimeline } from "@/actions/profile-page";
import { getCreatorSupportSummary, getViewerSupportForCreator, getViewerPlatformSupport } from "@/actions/support";
import { PlatformSupportCard } from "@/components/support/platform-support-card";
import { ProfileSupportBlock } from "@/components/support/profile-support-block";
import { parseProfileTab } from "@/lib/profile-queries";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ProfileTimeline, type TimelineItem } from "@/components/profile/profile-timeline";
import { ProfilePostCard } from "@/components/profile/profile-post-card";

const emptyMessages: Record<string, string> = {
  posts: "아직 게시물이 없습니다.",
  replies: "아직 남긴 답글이 없습니다.",
  media: "미디어가 포함된 게시물이 없습니다.",
  likes: "좋아요한 게시물이 없습니다.",
};

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = parseProfileTab(tabParam);

  const header = await getProfileHeader(username);
  if (!header) notFound();

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

  const paymentsEnabled = isPaymentsConfigured();

  return (
    <div className="max-w-2xl mx-auto min-h-screen border-x border-border/40">
      <ProfileHeader
        user={header.user}
        isSelf={header.isSelf}
        isFollowing={header.isFollowing}
        followsYou={header.followsYou}
        viewerSupport={viewerSupport}
        paymentsEnabled={paymentsEnabled}
      />

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

      {header.pinned && effectiveTab === "posts" && (
        <div className="border-b border-border/60">
          <p className="px-4 pt-3 text-xs text-muted-foreground">고정된 게시물</p>
          <ProfilePostCard post={header.pinned} />
        </div>
      )}

      <Suspense fallback={<div className="h-12 border-b border-border/60" />}>
        <ProfileTabs username={username} showLikesTab={header.isSelf} />
      </Suspense>

      <ProfileTimeline
        username={username}
        tab={effectiveTab}
        initialItems={initialItems}
        initialCursor={nextCursor}
        emptyMessage={emptyMessages[effectiveTab]}
      />
    </div>
  );
}
