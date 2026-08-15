import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageSquare, ArrowBigUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { TranslatableText } from "@/components/ui/translatable-text";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { FeedPostMediaCarousel } from "@/components/feed/feed-post-media-carousel";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";
import { PostCollaboratorsHeader } from "@/components/post/post-collaborators-header";
import type { SupportTierLevel } from "@prisma/client";

type PostCardProps = {
  post: {
    id: string;
    title?: string | null;
    content: string;
    createdAt: Date;
    isNsfw: boolean;
    author: {
      id: string;
      username: string;
      name?: string | null;
      image: string | null;
      supportTierSent?: SupportTierLevel;
    };
    collaborators?: {
      user: {
        id: string;
        username: string;
        name?: string | null;
        image: string | null;
        supportTierSent?: SupportTierLevel;
      };
    }[];
    community?: { name: string; slug: string } | null;
    media?: { id?: string; url: string; type: string; priceKrw?: number | null }[];
    _count?: { likes: number; comments: number; votes: number; media?: number };
  };
};

export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-4 space-y-3">
        <PostCollaboratorsHeader
          author={{
            ...post.author,
            supportTierSent: post.author.supportTierSent ?? "PEBBLE",
          }}
          collaborators={post.collaborators}
          trailing={
            <>
              {post.community && (
                <Link
                  href={`/c/${post.community.slug}`}
                  className="text-xs text-muted-foreground hover:text-primary ml-1"
                >
                  {post.community.name}
                </Link>
              )}
              {post.isNsfw && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive ml-1">
                  NSFW
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-1">
                {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: ko })}
              </span>
            </>
          }
        />
        <div>
          {post.title && (
            <Link href={`/post/${post.id}`} className="block">
              <h3 className="font-semibold mb-1">{post.title}</h3>
            </Link>
          )}
          <TranslatableText
            text={post.content}
            as="p"
            stopPropagation
            className="text-sm text-foreground/90 line-clamp-4 whitespace-pre-wrap"
          />
        </div>
        {post.media && post.media.length > 0 && (
          <FeedPostMediaCarousel
            media={post.media as ProfilePostMediaItem[]}
            postId={post.id}
            authorUsername={post.author.username}
            authorId={post.author.id}
            paymentsEnabled={false}
            isNsfw={post.isNsfw}
          />
        )}
        <div className="flex items-center gap-6 text-muted-foreground text-sm">
          <span className="flex items-center gap-1 hover:text-neon-pink cursor-pointer">
            <Heart className="h-4 w-4" />
            {formatNumber(post._count?.likes ?? 0)}
          </span>
          <span className="flex items-center gap-1 hover:text-neon-cyan cursor-pointer">
            <MessageSquare className="h-4 w-4" />
            {formatNumber(post._count?.comments ?? 0)}
          </span>
          <span className="flex items-center gap-1 hover:text-neon-purple cursor-pointer">
            <ArrowBigUp className="h-4 w-4" />
            {formatNumber(post._count?.votes ?? 0)}
          </span>
          <PostShareMenu
            postId={post.id}
            authorUsername={post.author.username}
            title={post.title}
            content={post.content}
            hasVideo={post.media?.some((m) => m.type === "VIDEO")}
            tone="plain"
            className="ml-auto"
          />
        </div>
      </CardContent>
    </Card>
  );
}
