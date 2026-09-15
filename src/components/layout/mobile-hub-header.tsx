"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { MobileDrawerNav, MobileMenuButton } from "@/components/layout/mobile-drawer-nav";
import { HeaderSearch } from "@/components/search/header-search";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function SearchPill() {
  return (
    <Suspense
      fallback={
        <div className="h-11 flex-1 rounded-xl border-2 border-folk-cobalt/20 bg-muted/40" aria-hidden />
      }
    >
      <HeaderSearch variant="pill" className="flex-1 min-w-0" />
    </Suspense>
  );
}

/** RN FeedScreen header strip — menu · search · bell · avatar */
export function MobileHubHeader({ className }: { className?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { session, pending, authenticated } = useAuthReady();
  const router = useRouter();
  const username = session?.user?.username;
  const displayName = session?.user?.name || username || "?";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-[150] flex items-center gap-2 px-3 pt-safe pb-2 bg-background/95 backdrop-blur-md border-b border-border/60",
          className
        )}
      >
        <MobileMenuButton onClick={() => setMenuOpen(true)} />

        <SearchPill />

        {authenticated ? (
          <Link
            href="/notifications"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/60"
            aria-label="알림"
          >
            <Bell className="h-[22px] w-[22px]" strokeWidth={2} />
          </Link>
        ) : pending && !session?.user ? (
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted/60 animate-pulse" aria-hidden />
        ) : null}

        {pending && !session?.user ? (
          <div
            className="h-10 w-10 shrink-0 rounded-full bg-muted/60 animate-pulse"
            aria-busy="true"
            aria-label="Loading session"
          />
        ) : authenticated && username ? (
          <Link
            href={`/u/${username}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            aria-label="내 프로필"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={session?.user?.image ?? undefined} />
              <AvatarFallback>{displayName[0]}</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/auth/signin")}
            className="inline-flex h-8 shrink-0 items-center rounded-full border border-border px-3 text-xs font-bold text-foreground"
          >
            로그인
          </button>
        )}
      </header>
      <MobileDrawerNav open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
