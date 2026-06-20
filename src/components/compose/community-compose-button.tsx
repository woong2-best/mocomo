"use client";

import { PenSquare } from "lucide-react";
import { AptMailboxLink } from "@/components/compose/apt-mailbox-link";
import { cn } from "@/lib/utils";

export function CommunityComposeButton({
  communityId,
  variant = "primary",
  className,
  children,
}: {
  communityId: string;
  variant?: "primary" | "secondary";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <AptMailboxLink
      communityId={communityId}
      className={cn(
        variant === "primary"
          ? "inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          : "inline-flex items-center justify-center rounded-xl border border-border bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80",
        className
      )}
    >
      {variant === "primary" && <PenSquare className="h-4 w-4" />}
      {children ?? (variant === "primary" ? "우편함" : "첫 글 올리기")}
    </AptMailboxLink>
  );
}
