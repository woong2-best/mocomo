import { notFound } from "next/navigation";
import Link from "next/link";
import { getCommunityBySlug } from "@/actions/community-hub";
import { PostCard } from "@/components/feed/post-card";
import { communityCategoryLabel } from "@/lib/community-labels";
import { CommunityJoinButton } from "@/components/communities/community-join-button";
import { CommunitySubnav } from "@/components/communities/community-subnav";
import { CommunityComposeButton } from "@/components/compose/community-compose-button";
import { ChevronLeft, Users, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCommunityBySlug(slug);
  if (!data) notFound();

  const { community, viewer } = data;
  const categoryLabel = communityCategoryLabel(community.category);
  const isMember = viewer?.isMember ?? false;
  const isOwner = viewer?.isOwner ?? false;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-nav lg:pb-8 space-y-6">
      <Link
        href="/communities"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        커뮤니티 목록
      </Link>

      <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{community.name}</h1>
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary font-medium">
                {categoryLabel}
              </span>
              {community.isNsfw && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-destructive/15 text-destructive font-medium">
                  NSFW
                </span>
              )}
            </div>
            {community.description ? (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">
                {community.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">설명이 없습니다.</p>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {community.memberCount.toLocaleString()}명
            </div>
          </div>
          {viewer && (
            <CommunityJoinButton
              communityId={community.id}
              isMember={isMember}
              isOwner={isOwner}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(isMember || isOwner) && (
            <CommunityComposeButton communityId={community.id} />
          )}
          {!viewer && (
            <p className="text-xs text-muted-foreground">글을 쓰려면 로그인 후 가입해 주세요.</p>
          )}
        </div>
      </div>

      <CommunitySubnav slug={slug} showSettings={isOwner} />

      {community.children.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">하위 커뮤니티</h2>
          <div className="flex flex-wrap gap-2">
            {community.children.map((sub) => (
              <Link
                key={sub.id}
                href={`/c/${sub.slug}`}
                className="text-sm px-3 py-1.5 rounded-full bg-muted hover:bg-primary/20 border border-border"
              >
                {sub.name}
                <span className="text-muted-foreground ml-1">({sub.memberCount})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          게시글
        </h2>
        {community.posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center space-y-3">
            <p className="text-muted-foreground text-sm">아직 글이 없어요.</p>
            {(isMember || isOwner) && (
              <CommunityComposeButton communityId={community.id} variant="secondary" />
            )}
          </div>
        ) : (
          community.posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>
    </div>
  );
}
