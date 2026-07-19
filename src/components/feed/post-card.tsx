"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, ArrowBigUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { TranslatableText } from "@/components/ui/translatable-text";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { PaidPostMediaGrid } from "@/components/profile/paid-post-media-grid";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";

type PostCardProps = {
  post: {
    id: string;
    title?: string | null;
    content: string;
    createdAt: Date;
    isNsfw: boolean;
    author: { id: string; username: string; image: string | null; level: number };
    community?: { name: string; slug: string } | null;
    media?: { id?: string; url: string; type: string; priceKrw?: number | null }[];
    _count?: { likes: number; comments: number; votes: number; media?: number };
  };
};

export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Link href={`/u/${post.author.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.image ?? undefined} />
              <AvatarFallback>{post.author.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/u/${post.author.username}`} className="font-semibold hover:text-primary">
                {post.author.username}
              </Link>
              <span className="text-xs text-neon-cyan">Lv.{post.author.level}</span>
              {post.community && (
                <Link
                  href={`/c/${post.community.slug}`}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {post.community.name}
                </Link>
              )}
              {post.isNsfw && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                  NSFW
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: ko })}
              </span>
            </div>
            <Link href={`/post/${post.id}`} className="block mt-2">
              {post.title && <h3 className="font-semibold mb-1">{post.title}</h3>}
              <TranslatableText
                text={post.content}
                as="p"
                stopPropagation
                className="text-sm text-foreground/90 line-clamp-4 whitespace-pre-wrap"
              />
            </Link>
            {post.media && post.media.length > 0 && (
              <PaidPostMediaGrid
                media={post.media as ProfilePostMediaItem[]}
                postId={post.id}
                authorUsername={post.author.username}
                authorId={post.author.id}
                paymentsEnabled={false}
                mediaTotal={post._count?.media ?? post.media.length}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-6 text-muted-foreground text-sm pl-13">
          <span className="flex items-center gap-1 hover:text-neon-pink cursor-pointer">
            <Heart className="h-4 w-4" />
            {formatNumber(post._count?.likes ?? 0)}
          </span>
          <span className="flex items-center gap-1 hover:text-neon-cyan cursor-pointer">
            <MessageCircle className="h-4 w-4" />
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
