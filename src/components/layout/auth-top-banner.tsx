"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

/** 모바일에서 로그인/가입 항상 보이게 (헤더 위) */
export function AuthTopBanner() {
  const { data: session, status } = useSession();
  if (status === "loading" || session?.user) return null;

  return (
    <div className="sticky top-14 z-40 lg:hidden border-b border-primary/20 bg-gradient-to-r from-violet-600 to-pink-600 text-white px-4 py-2.5 flex items-center justify-between gap-2">
      <p className="text-sm font-medium truncate">가입하고 덕질 시작!</p>
      <div className="flex gap-2 shrink-0">
        <Link href="/auth/signin">
          <Button size="sm" variant="secondary" className="h-8 rounded-lg text-xs">
            로그인
          </Button>
        </Link>
        <Link href="/auth/signup">
          <Button size="sm" className="h-8 rounded-lg text-xs bg-white text-violet-700 hover:bg-white/90">
            가입
          </Button>
        </Link>
      </div>
    </div>
  );
}
