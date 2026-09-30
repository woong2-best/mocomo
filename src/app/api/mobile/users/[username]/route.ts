import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { postMediaPreview } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";
import { isPaymentsConfigured } from "@/lib/payments";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { platformPostWhere } from "@/lib/post-scope";
import { nsfwPostWhere, resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";
import { hydrateUserOAuthProfile } from "@/lib/oauth-vault";
import { hydrateViewerPollVotes, mapPostPollRow, postPollSelect } from "@/lib/post-poll";
import { contactPermissions } from "@/lib/contact-audience";
import { getUserRelationship, isProfileBlocked } from "@/lib/user-relationship";
import { quotedPostPreviewSelect } from "@/lib/quoted-post";

const profileTimelinePostSelect = {
  id: true,
  title: true,
  content: true,
  postType: true,
  createdAt: true,
  isNsfw: true,
  isPinned: true,
  visibility: true,
  instantPurchasePriceKrw: true,
  media: postMediaPreview,
  poll: { select: postPollSelect },
  quotedPost: { select: quotedPostPreviewSelect },
  _count: { select: { likes: true, comments: true, reposts: true } },
  author: { select: userPublicSelect },
} as const;

function serializeQuotedPost(
  quoted: { createdAt: Date | string; [key: string]: unknown } | null | undefined
) {
  if (!quoted) return null;
  return {
    ...quoted,
    createdAt:
      quoted.createdAt instanceof Date
        ? quoted.createdAt.toISOString()
        : String(quoted.createdAt),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-user-profile", 60);
  if (limited) return limited;

  const { username: raw } = await params;
  const username = decodeURIComponent(raw ?? "").trim();
  if (!username || username.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const viewerId = await getMobileUserId(req);
  const user = await db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      email: true,
      passwordHash: true,
      deletedAt: true,
      createdAt: true,
      countryCode: true,
      creatorSubscriptionPriceKrw: true,
      profileMainPostId: true,
      profile: { select: { bio: true, bannerUrl: true, bannerVideoUrl: true } },
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });

  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  let following = false;
  let subscribed = false;
  if (viewerId && viewerId !== user.id) {
    const [edge, sub] = await Promise.all([
      db.follow.findUnique({
        where: {
          followerId_followingId: { followerId: viewerId, followingId: user.id },
        },
        select: { id: true },
      }),
      db.subscription.findUnique({
        where: {
          subscriberId_creatorId: { subscriberId: viewerId, creatorId: user.id },
        },
        select: { status: true, currentPeriodEnd: true, subscribedSince: true },
      }),
    ]);
    following = !!edge;
    subscribed = sub ? isSubscriptionActive(sub) : false;
  }

  const canViewNsfw = await resolveCanViewNsfw(viewerId);
  const isSelf = viewerId === user.id;
  const relationship = await getUserRelationship(viewerId, user.id);
  const perms =
    viewerId && !isSelf
      ? await contactPermissions(viewerId, user.id)
      : { canMessage: true, canCall: true };

  const pinnedPostId = user.profileMainPostId;
  const viewerProfileMainPostId =
    viewerId && viewerId !== user.id
      ? (
          await db.user.findUnique({
            where: { id: viewerId },
            select: { profileMainPostId: true },
          })
        )?.profileMainPostId ?? null
      : viewerId
        ? pinnedPostId
        : null;

  const profileBlocked = !isSelf && isProfileBlocked(relationship);

  const posts = profileBlocked
    ? []
    : await db.post.findMany({
        where: {
          authorId: user.id,
          isPinned: false,
          ...(pinnedPostId ? { id: { not: pinnedPostId } } : {}),
          ...platformPostWhere,
          ...(isSelf ? {} : nsfwPostWhere(canViewNsfw)),
        },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: profileTimelinePostSelect,
      });

  const reposts = profileBlocked
    ? []
    : await db.repost.findMany({
    where: {
      userId: user.id,
      post: {
        ...platformPostWhere,
        ...(isSelf ? {} : nsfwPostWhere(canViewNsfw)),
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      createdAt: true,
      user: { select: { id: true, username: true, name: true, image: true } },
      post: { select: profileTimelinePostSelect },
    },
      });

  type ProfileActivity = (typeof posts)[number] & {
    activityKey: string;
    activityAt: string;
    repostBy: {
      id: string;
      createdAt: string;
      user: { id: string; username: string; name: string | null; image: string | null };
    } | null;
  };

  const activities: ProfileActivity[] = [
    ...posts.map((post) => ({
      ...post,
      activityKey: `post:${post.id}`,
      activityAt: post.createdAt.toISOString(),
      repostBy: null,
    })),
    ...reposts.map((row) => ({
      ...row.post,
      activityKey: `repost:${row.id}`,
      activityAt: row.createdAt.toISOString(),
      repostBy: {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        user: row.user,
      },
    })),
  ]
    .sort((a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime())
    .filter((row) => !pinnedPostId || row.id !== pinnedPostId)
    .slice(0, 40);

  const pinnedRaw =
    profileBlocked || !pinnedPostId
      ? null
      : await db.post.findFirst({
          where: {
            id: pinnedPostId,
            ...platformPostWhere,
            ...(isSelf ? {} : nsfwPostWhere(canViewNsfw)),
          },
          select: profileTimelinePostSelect,
        });

  const gatePosts = async (
    rows: (ProfileActivity | (typeof pinnedRaw & { authorId: string }))[]
  ) =>
    hydrateViewerPollVotes(
      (
        await attachWebPaidMediaPlayback(
          rows.map((p) => ({ ...p, authorId: p.author.id })),
          viewerId
        )
      ).map((p) => ({
        ...p,
        poll: p.poll ? mapPostPollRow(p.poll) : null,
      })),
      viewerId
    );

  const gatedPosts = await gatePosts(activities);

  const gatedPinned = pinnedRaw
    ? (await gatePosts([{ ...pinnedRaw, activityKey: `post:${pinnedRaw.id}`, activityAt: pinnedRaw.createdAt.toISOString(), repostBy: null }]))[0] ?? null
    : null;

  const mapPostResponse = (p: (typeof gatedPosts)[number]) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    profilePinned: !!viewerProfileMainPostId && p.id === viewerProfileMainPostId,
    quotedPost: serializeQuotedPost(p.quotedPost),
  });

  const displayed = await hydrateUserOAuthProfile({
    id: user.id,
    name: user.name,
    image: user.image,
    email: user.email,
    passwordHash: user.passwordHash,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: displayed.name,
      image: displayed.image,
      bio: user.profile?.bio ?? null,
      bannerUrl: user.profile?.bannerUrl ?? null,
      bannerVideoUrl: user.profile?.bannerVideoUrl ?? null,
      countryCode: user.countryCode ?? null,
      createdAt: user.createdAt.toISOString(),
      counts: {
        posts: user._count.posts,
        followers: user._count.followers,
        following: user._count.following,
      },
      following,
      subscribed,
      isSelf: viewerId === user.id,
      canMessage: perms.canMessage,
      canCall: perms.canCall,
      paymentsEnabled: isPaymentsConfigured(),
      creatorSubscriptionPriceKrw: user.creatorSubscriptionPriceKrw,
      mutedByViewer: relationship.mutedByViewer,
      blockedByViewer: relationship.blockedByViewer,
      blockedViewer: relationship.blockedViewer,
      profileBlocked,
    },
    pinnedPost: gatedPinned ? mapPostResponse(gatedPinned) : null,
    posts: gatedPosts.map(mapPostResponse),
  });
}
