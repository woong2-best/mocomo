"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Props = {
  image?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

/** Same folk squircle as the rest of the site — terracotta letter if no photo. */
export function CommentCircleAvatar({ image, name, size = 36, className }: Props) {
  const letter = (name || "?").trim().slice(0, 1).toUpperCase() || "?";

  return (
    <Avatar
      className={cn("ring-0 ring-offset-0", className)}
      style={{ width: size, height: size }}
    >
      <AvatarImage src={image} alt="" />
      <AvatarFallback
        className="text-white"
        style={{ fontSize: Math.round(size * 0.42) }}
      >
        {letter}
      </AvatarFallback>
    </Avatar>
  );
}

export function commentDisplayName(
  author: { username?: string | null; name?: string | null },
  fallback = "Unknown"
): string {
  return author.username?.trim() || author.name?.trim() || fallback;
}
