import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Pin, Repeat2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { GridPost } from "@/components/feed/feed-post-card";

export function ProfilePostCard({
  post,
  meta,
}: {
  post: GridPost & { createdAt: Date | string; isPinned?: boolean };
  meta?: string;
}) {
  const createdAt = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
  const author = post.author as GridPost["author"] & { name?: string | null };
  const displayName = author.cosplayerProfile?.stageName || author.name || author.username;

  return (
    <Link
      href={`/post/${post.id}`}
      className="block px-4 py-3 border-b border-border/60 hover:bg-muted/30 transition-colors"
    >
      {meta && (
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Repeat2 className="h-3 w-3" />
          {meta}
        </p>
      )}
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={post.author.image ?? undefined} />
          <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-wrap text-sm">
            <span className="font-bold truncate">{displayName}</span>
            <span className="text-muted-foreground truncate">@{post.author.username}</span>
            <span className="text-muted-foreground">·</span>
            <time className="text-muted-foreground shrink-0" dateTime={createdAt.toISOString()}>
              {formatDistanceToNow(createdAt, { addSuffix: true, locale: ko })}
            </time>
            {post.isPinned && (
              <span className="text-muted-foreground flex items-center gap-0.5 ml-1">
                <Pin className="h-3 w-3" /> 고정
              </span>
            )}
          </div>
          {post.title && <p className="font-semibold mt-1 text-[15px]">{post.title}</p>}
          <p className="mt-1 text-[15px] whitespace-pre-wrap break-words line-clamp-6">{post.content}</p>
          {post.media && post.media.length > 0 && (
            <div
              className={`mt-3 grid gap-1 rounded-2xl overflow-hidden border border-border/50 ${
                post.media.length > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {post.media.slice(0, 4).map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m.url} src={m.url} alt="" className="w-full max-h-80 object-cover" />
              ))}
            </div>
          )}
          <div className="flex gap-6 mt-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {formatNumber(post._count?.comments ?? 0)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {formatNumber(post._count?.likes ?? 0)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
