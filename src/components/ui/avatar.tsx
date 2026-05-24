import * as React from "react";
import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-border", className)}
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
        "flex h-full w-full items-center justify-center rounded-full btn-rainbow text-sm font-bold text-white",
        className
      )}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
