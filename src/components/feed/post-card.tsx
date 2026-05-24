import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Share2, ArrowBigUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";

type PostCardProps = {
  post: {
    id: string;
    title?: string | null;
    content: string;
    createdAt: Date;
    isNsfw: boolean;
    author: { id: string; username: string; image: string | null; level: number };
    community?: { name: string; slug: string } | null;
    media?: { url: string; type: string }[];
    _count?: { likes: number; comments: number; votes: number };
  };
};

export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Link href={`/u/${post.author.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.image} />
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
              <p className="text-sm text-foreground/90 line-clamp-4 whitespace-pre-wrap">
                {post.content}
              </p>
            </Link>
            {post.media && post.media.length > 0 && (
              <div className="mt-3 grid gap-2 grid-cols-2">
                {post.media.slice(0, 4).map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.url}
                    src={m.url}
                    alt=""
                    className="rounded-lg object-cover max-h-48 w-full"
                  />
                ))}
              </div>
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
          <Share2 className="h-4 w-4 hover:text-foreground cursor-pointer ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}
