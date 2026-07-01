"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { CONNECTION_TABS, type ConnectionTab } from "@/lib/user-connections";
import { cn } from "@/lib/utils";

export function UserConnectionsHeader({
  username,
  displayName,
  followerCount,
  activeTab,
}: {
  username: string;
  displayName: string;
  followerCount: number;
  activeTab: ConnectionTab;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function tabHref(tab: ConnectionTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
      <div className="flex items-center gap-2 px-2 py-2">
        <Link
          href={`/u/${username}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/70 shrink-0"
          aria-label="프로필로"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[17px] leading-tight truncate">{displayName}</h1>
          <p className="text-sm text-muted-foreground truncate">
            팔로워 {followerCount.toLocaleString()}명
          </p>
        </div>
        <Link
          href="/discover"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/70 shrink-0"
          aria-label="사람 찾기"
        >
          <UserPlus className="h-5 w-5" />
        </Link>
      </div>

      <nav
        className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-t border-border/40"
        aria-label="팔로워·팔로잉 탭"
      >
        {CONNECTION_TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Link
              key={tab.id}
              href={tabHref(tab.id)}
              className={cn(
                "relative shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
