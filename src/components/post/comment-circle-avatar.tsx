"use client";

import { useEffect, useState } from "react";
import { displayableImageUrl } from "@/lib/displayable-image-url";
import { cn } from "@/lib/utils";

type Props = {
  image?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

/** Circular comment avatar with letter fallback — Instagram Reels style. */
export function CommentCircleAvatar({ image, name, size = 36, className }: Props) {
  const [failed, setFailed] = useState(false);
  const src = displayableImageUrl(image);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const letter = (name || "?").trim().slice(0, 1).toUpperCase() || "?";
  const showPhoto = Boolean(src) && !failed;

  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-neutral-700", className)}
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-bold text-white"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {letter}
        </span>
      )}
    </span>
  );
}

export function commentDisplayName(
  author: { username?: string | null; name?: string | null },
  fallback = "Unknown"
): string {
  return author.username?.trim() || author.name?.trim() || fallback;
}
