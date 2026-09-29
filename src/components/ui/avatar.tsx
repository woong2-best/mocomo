"use client";

import * as React from "react";
import { displayableImageUrl } from "@/lib/displayable-image-url";
import { cn } from "@/lib/utils";

/**
 * MoCoMo folk avatar — squircle (rounded square), never a circle.
 * Outer pale cobalt ring + terracotta fallback (matches brand avatar chip).
 */
export const avatarShapeClass = "rounded-[28%]";

function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden",
        "ring-2 ring-[hsl(var(--folk-cobalt)/0.28)] ring-offset-1 ring-offset-background",
        avatarShapeClass,
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, src, alt }: { className?: string; src?: string | null; alt?: string }) {
  const displaySrc = displayableImageUrl(src);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    setFailed(false);
  }, [displaySrc]);
  if (!displaySrc || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={alt || ""}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(
        "absolute inset-0 z-[1] h-full w-full object-cover",
        avatarShapeClass,
        className
      )}
    />
  );
}

function AvatarFallback({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-0 flex h-full w-full items-center justify-center bg-folk-terracotta text-sm font-bold text-white",
        avatarShapeClass,
        className
      )}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
