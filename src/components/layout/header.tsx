import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Bell, Search, Gem } from "lucide-react";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BRAND } from "@/lib/brand";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 lg:px-5 shadow-sm">
      <Link href="/" className="lg:hidden font-black text-lg shrink-0 text-foreground">
        {BRAND.name}
      </Link>

      <div className="flex flex-1 justify-center max-w-2xl mx-auto">
        <form action="/search" className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            placeholder="검색"
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#1e88e5]/40"
          />
        </form>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        {session ? (
          <>
            <Link href="/notifications">
              <Button variant="ghost" size="icon" title="알림" className="rounded-xl">
                <Bell className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/support" className="hidden sm:block">
              <Button variant="outline" size="sm" className="gap-1 rounded-xl">
                <Gem className="h-4 w-4" />
                <span className="text-xs">등급</span>
              </Button>
            </Link>
            <ProfileMenu />
          </>
        ) : (
          <>
            <Link href="/auth/signin">
              <Button variant="outline" size="sm" className="rounded-xl">
                로그인
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="rounded-xl">
                가입
              </Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
