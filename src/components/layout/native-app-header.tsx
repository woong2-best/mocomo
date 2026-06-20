"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { HeaderAuth } from "@/components/layout/header-auth";
import { cn } from "@/lib/utils";

const ROOT_PATHS = new Set(["/", DEFAULT_LANDING_PATH, "/explore", "/notifications", "/messages"]);

function titleForPath(pathname: string): string | null {
  if (pathname.startsWith("/u/")) return "프로필";
  if (pathname.startsWith("/post/")) return "게시물";
  if (pathname.startsWith("/settings")) return "설정";
  if (pathname.startsWith("/auth/")) return "계정";
  if (pathname === "/explore") return "탐색";
  if (pathname === "/notifications") return "알림";
  if (pathname === "/messages") return "쪽지";
  return null;
}

export function NativeAppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = ROOT_PATHS.has(pathname) || pathname.startsWith("/messages/");
  const title = titleForPath(pathname);
  const showBack = !isRoot && !!title;

  return (
    <header className="sticky top-0 z-[150] flex min-h-[3.25rem] items-center gap-2 border-b border-border/70 bg-background/95 backdrop-blur-md px-3 pt-safe pb-2">
      <div className="flex w-10 shrink-0 items-center justify-start">
        {showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/60"
            aria-label="뒤로"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 text-center">
        {title ? (
          <h1 className="truncate text-base font-bold">{title}</h1>
        ) : (
          <Link href={DEFAULT_LANDING_PATH} className="inline-flex items-center gap-2">
            <span className="font-display text-lg font-bold text-folk-cobalt">{BRAND.name}</span>
          </Link>
        )}
      </div>

      <div className="flex w-10 shrink-0 items-center justify-end gap-1">
        {!showBack && (
          <Link
            href="/search"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/60",
              pathname.startsWith("/search") && "text-primary"
            )}
            aria-label="검색"
          >
            <Search className="h-5 w-5" />
          </Link>
        )}
        <HeaderAuth compact />
      </div>
    </header>
  );
}
