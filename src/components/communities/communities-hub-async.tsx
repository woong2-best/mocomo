import Link from "next/link";
import { format, isToday, isThisYear } from "date-fns";
import { ko } from "date-fns/locale";
import { Check, Plus, Users } from "lucide-react";
import { getCachedCommunityHubData } from "@/lib/cached-data";
import { communityCategoryLabel } from "@/lib/community-labels";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HubPost = Awaited<ReturnType<typeof getCachedCommunityHubData>>["hotPosts"][number];
type HubCommunity = Awaited<ReturnType<typeof getCachedCommunityHubData>>["communities"][number];

function postTitle(post: HubPost): string {
  const title = post.title?.trim();
  if (title) return title;
  const body = post.content.trim().replace(/\s+/g, " ");
  return body.length > 72 ? `${body.slice(0, 72)}…` : body || "제목 없음";
}

function postThumb(post: HubPost): string | null {
  const media = post.media[0];
  if (!media) return null;
  if (media.type === "VIDEO") return null;
  return media.url;
}

function formatPostTime(date: Date): string {
  if (isToday(date)) return format(date, "HH:mm", { locale: ko });
  if (isThisYear(date)) return format(date, "M.d", { locale: ko });
  return format(date, "yy.M.d", { locale: ko });
}

function FeaturedCards({ posts }: { posts: HubPost[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
      {posts.map((post) => {
        const thumb = postThumb(post);
        const title = postTitle(post);
        return (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className="group relative aspect-[4/3] overflow-hidden bg-muted/80"
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-folk-cobalt/20 to-folk-forest/15 p-3">
                <p className="text-xs sm:text-sm font-medium text-foreground/80 line-clamp-4 text-center leading-snug">
                  {title}
                </p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-2 pb-1.5 pt-8">
              <p className="text-[11px] sm:text-xs font-medium text-white line-clamp-2 leading-snug drop-shadow-sm">
                {title}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function HotPostRow({ post }: { post: HubPost }) {
  const thumb = postThumb(post);
  const title = postTitle(post);
  const comments = post._count.comments;
  const communityName = post.community?.name ?? "전체";
  const communityHref = post.community ? `/c/${post.community.slug}` : "/explore";

  return (
    <div className="group flex items-center gap-2.5 border-b border-border/50 px-2.5 py-2 hover:bg-muted/40 transition-colors last:border-b-0">
      <Link
        href={`/post/${post.id}`}
        className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden bg-muted"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-folk-cobalt/10 text-[10px] font-bold text-folk-cobalt/70">
            {communityName.slice(0, 2)}
          </div>
        )}
      </Link>

      <Link href={`/post/${post.id}`} className="min-w-0 flex-1 flex items-baseline gap-1.5">
        <span className="text-sm text-foreground line-clamp-1 group-hover:underline decoration-foreground/30 underline-offset-2">
          {title}
        </span>
        {comments > 0 && (
          <span className="shrink-0 text-sm font-bold text-[#c80000] tabular-nums">
            [{comments}]
          </span>
        )}
      </Link>

      <Link
        href={communityHref}
        className="hidden sm:block shrink-0 max-w-[7.5rem] truncate text-xs text-muted-foreground hover:text-foreground"
        title={communityName}
      >
        {communityName}
      </Link>

      <time
        dateTime={post.createdAt.toISOString()}
        className="shrink-0 w-11 text-right text-xs text-muted-foreground tabular-nums"
      >
        {formatPostTime(post.createdAt)}
      </time>
    </div>
  );
}

function CommunityDirectoryRow({ community }: { community: HubCommunity }) {
  const initial = community.name.slice(0, 1);

  return (
    <Link
      href={`/c/${community.slug}`}
      className="flex items-center gap-3 border-b border-border/50 px-3 py-2.5 hover:bg-muted/40 transition-colors last:border-b-0"
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden bg-muted">
        {community.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.iconUrl} alt="" className="h-full w-full object-cover" />
        ) : community.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-folk-cobalt/15 text-sm font-bold text-folk-cobalt">
            {initial}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm truncate">{community.name}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {communityCategoryLabel(community.category)}
          </span>
          {community.isNsfw && (
            <span className="shrink-0 text-[10px] font-semibold text-destructive">NSFW</span>
          )}
        </div>
        {community.description ? (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{community.description}</p>
        ) : null}
      </div>

      <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
        <Users className="h-3.5 w-3.5" />
        {community.memberCount}
      </div>
    </Link>
  );
}

export async function CommunitiesHubAsync() {
  let communities: HubCommunity[] = [];
  let hotPosts: HubPost[] = [];

  try {
    const data = await getCachedCommunityHubData();
    communities = data.communities;
    hotPosts = data.hotPosts;
  } catch {
    communities = [];
    hotPosts = [];
  }

  const withMedia = hotPosts.filter((p) => postThumb(p));
  const featured =
    withMedia.length >= 4
      ? withMedia.slice(0, 4)
      : [...withMedia, ...hotPosts.filter((p) => !postThumb(p))].slice(0, 4);
  const featuredIds = new Set(featured.map((p) => p.id));
  const listPosts = hotPosts.filter((p) => !featuredIds.has(p.id)).slice(0, 20);

  return (
    <div className="space-y-6">
      {/* 실시간 베스트 */}
      <section className="overflow-hidden rounded-md border border-border/80 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Check className="h-3.5 w-3.5 text-[#c80000]" strokeWidth={3} />
              실시간 베스트
            </h2>
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">
              커뮤니티에서 지금 핫한 글
            </span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {hotPosts.length > 0 ? `${Math.min(hotPosts.length, 24)}건` : "0건"}
          </span>
        </div>

        {hotPosts.length === 0 ? (
          <div className="px-4 py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              아직 커뮤니티 인기글이 없어요. 커뮤니티에 글을 올려보세요!
            </p>
            {communities[0] ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/c/${communities[0].slug}`}>첫 커뮤니티 둘러보기</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div>
            <div className="p-1.5 sm:p-2">
              <FeaturedCards posts={featured} />
            </div>
            {listPosts.length > 0 ? (
              <div className="border-t border-border/60">
                {listPosts.map((post) => (
                  <HotPostRow key={post.id} post={post} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* 커뮤니티 목록 */}
      <section className="overflow-hidden rounded-md border border-border/80 bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-3 py-2">
          <h2 className="text-sm font-bold">커뮤니티 목록</h2>
          <Link
            href="/communities/new"
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            만들기
          </Link>
        </div>

        {communities.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            커뮤니티가 없습니다. 첫 커뮤니티를 만들어보세요!
          </div>
        ) : (
          <div>
            {communities.map((c) => (
              <CommunityDirectoryRow key={c.id} community={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
