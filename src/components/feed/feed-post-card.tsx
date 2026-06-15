import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Star } from "lucide-react";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { formatNumber } from "@/lib/utils";
import type { SupportTierLevel } from "@prisma/client";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import type { PostPollView } from "@/lib/post-poll";

export type GridPost = {
  id: string;
  title?: string | null;
  content: string;
  postType?: string;
  createdAt: Date | string;
  isNsfw: boolean;
  isPinned?: boolean;
  author: {
    id: string;
    username: string;
    image: string | null;
    level: number;
    supportTierSent: SupportTierLevel;
    cosplayerProfile?: { stageName: string | null } | null;
  };
  anime?: { title: string; slug: string } | null;
  media?: { url: string; type: string }[];
  poll?: PostPollView | null;
  _count?: { likes: number; comments: number; votes: number; reposts?: number };
};

const typeLabels: Record<string, string> = {
  COSPLAY: "코스프레",
  FANART: "팬아트",
  REVIEW: "리뷰",
  MEME: "밈",
  NEWS: "뉴스",
  PHOTO: "사진",
  VIDEO: "영상",
};

export function FeedPostCard({ post }: { post: GridPost }) {
  const displayName = userDisplayName(post.author);
  const cover = post.media?.[0];

  return (
    <Card className="overflow-hidden hover:border-primary/40 transition-all duration-300 group h-full flex flex-col">
      <CardContent className="p-0 flex flex-col flex-1">
        <div className="flex items-center gap-2 p-3 pb-2">
          <Link href={`/u/${post.author.username}`}>
            <Avatar className="h-8 w-8 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
              <AvatarImage src={post.author.image} />
              <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/u/${post.author.username}`} className="hover:text-primary block min-w-0">
              <DisplayNameWithSupportTier
                name={displayName}
                tier={post.author.supportTierSent ?? "PEBBLE"}
                nameClassName="font-semibold text-sm"
                compact
              />
            </Link>
            <div className="flex items-center gap-1.5 flex-wrap">
              {post.postType && post.postType !== "GENERAL" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {typeLabels[post.postType] || post.postType}
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: ko })}
          </span>
        </div>

        <Link href={`/post/${post.id}`} className="block flex-1">
          {cover ? (
            cover.type === "VIDEO" ? (
              <video
                src={cover.url}
                className="w-full aspect-[4/5] object-cover bg-black"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.url} alt="" className="w-full aspect-[4/5] object-cover" />
            )
          ) : (
            <div className="px-3 pb-3">
              {post.title && <h3 className="font-semibold text-sm mb-1">{post.title}</h3>}
              <p className="text-sm text-foreground/85 line-clamp-6">{post.content}</p>
            </div>
          )}
        </Link>

        {post.anime && (
          <Link href={`/anime/${post.anime.slug}`} className="px-3 text-xs text-neon-cyan hover:underline">
            {post.anime.title}
          </Link>
        )}

        <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/40 text-muted-foreground">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-0.5 hover:text-neon-pink">
              <Heart className="h-3.5 w-3.5" />
              {formatNumber(post._count?.likes ?? 0)}
            </span>
            <span className="flex items-center gap-0.5 hover:text-neon-cyan">
              <MessageCircle className="h-3.5 w-3.5" />
              {formatNumber(post._count?.comments ?? 0)}
            </span>
            <PostShareMenu
              postId={post.id}
              authorUsername={post.author.username}
              title={post.title}
              content={post.content}
              hasVideo={post.media?.some((m) => m.type === "VIDEO")}
              tone="plain"
            />
          </div>
          <Star className="h-4 w-4 text-yellow-500/70" aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}
