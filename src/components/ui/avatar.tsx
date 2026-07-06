import * as React from "react";
import { cn } from "@/lib/utils";

/** 프로필·게시글 아바타 — 둥근 모서리 사각형 */
export const avatarShapeClass = "rounded-xl";

function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden ring-2 ring-border",
        avatarShapeClass,
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, src, alt }: { className?: string; src?: string | null; alt?: string }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt || ""} className={cn("aspect-square h-full w-full object-cover", className)} />
  );
}

function AvatarFallback({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-folk-terracotta text-sm font-bold text-white",
        avatarShapeClass,
        className
      )}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
