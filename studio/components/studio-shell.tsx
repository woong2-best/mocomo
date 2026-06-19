"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BookOpen,
  Box,
  Home,
  LayoutGrid,
  Library,
  Palette,
  Settings,
  Shield,
  Wallet,
} from "lucide-react";
import { getMocomoBaseUrl, getStudioBaseUrl } from "@/studio/lib/host";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/studio", label: "홈", icon: Home, exact: true },
  { href: "/studio/create", label: "제작", icon: Palette },
  { href: "/studio/assets", label: "내 자산", icon: Box },
  { href: "/studio/library", label: "보관함", icon: Library },
  { href: "/studio/market", label: "마켓", icon: LayoutGrid },
  { href: "/studio/wallet", label: "수익", icon: Wallet },
  { href: "/studio/settings", label: "설정", icon: Settings },
];

export function StudioShell({ children, isReviewer }: { children: React.ReactNode; isReviewer?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const mocomoUrl = getMocomoBaseUrl();

  return (
    <div className="studio-theme min-h-screen bg-[#fef8fb] pb-20 text-foreground md:pb-0">
      <header className="sticky top-0 z-40 border-b border-pink-100/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/studio" className="flex items-center gap-2 font-display text-lg font-semibold text-[#e879a9]">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-pink-200 to-violet-200 text-sm">
              ✦
            </span>
            MoCoMo Studio
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                    active ? "bg-pink-100/80 font-medium text-pink-700" : "text-muted-foreground hover:bg-pink-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            <Link
              href="/studio/guide"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
                pathname === "/studio/guide" ? "bg-violet-100 text-violet-700" : "text-muted-foreground hover:bg-violet-50"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              가이드
            </Link>
            {isReviewer && (
              <>
                <Link
                  href="/studio/admin/review"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
                    pathname.startsWith("/studio/admin/review")
                      ? "bg-violet-100 text-violet-700"
                      : "text-muted-foreground hover:bg-violet-50"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  검수
                </Link>
                <Link
                  href="/studio/admin/payouts"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
                    pathname.startsWith("/studio/admin/payouts")
                      ? "bg-violet-100 text-violet-700"
                      : "text-muted-foreground hover:bg-violet-50"
                  }`}
                >
                  출금
                </Link>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <a href={mocomoUrl} className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline">
              MoCoMo로
            </a>
            {session?.user ? (
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: getStudioBaseUrl() })}>
                로그아웃
              </Button>
            ) : (
              <Button asChild size="sm">
                <a href={`${mocomoUrl}/auth/signin?callbackUrl=${encodeURIComponent(getStudioBaseUrl())}`}>
                  로그인
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-pink-100 bg-white/95 md:hidden">
        {[NAV[0], NAV[1], NAV[3], NAV[4], NAV[6]].map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                active ? "text-pink-600" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <footer className="hidden border-t border-pink-100/60 py-6 text-center text-xs text-muted-foreground md:block">
        MoCoMo Studio · 창작 공간 · 기존 MoCoMo와 독립 운영
      </footer>
    </div>
  );
}
