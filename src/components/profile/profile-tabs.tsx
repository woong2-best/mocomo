"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ProfileTab } from "@/lib/profile-queries";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "posts", label: "게시물" },
  { id: "replies", label: "답글" },
  { id: "media", label: "미디어" },
  { id: "likes", label: "좋아요" },
];

export function ProfileTabs({
  username,
  showLikesTab = false,
}: {
  username: string;
  showLikesTab?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = (searchParams.get("tab") as ProfileTab) || "posts";
  const base = `/u/${username}`;

  return (
    <nav className="flex border-b border-border/60 sticky top-[calc(3.5rem+3.25rem)] z-10 bg-background/95 backdrop-blur-md">
      {tabs.filter((t) => showLikesTab || t.id !== "likes").map((t) => {
        const href = t.id === "posts" ? base : `${base}?tab=${t.id}`;
        const isActive = pathname === base && active === t.id;
        return (
          <Link
            key={t.id}
            href={href}
            className={cn(
              "flex-1 py-4 text-center text-sm font-medium hover:bg-muted/40 transition-colors relative",
              isActive && "font-bold"
            )}
          >
            {t.label}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
