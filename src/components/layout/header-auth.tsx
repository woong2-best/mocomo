"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { Bell, Gem } from "lucide-react";

/** 서버 세션 실패해도 클라이언트에서 로그인 버튼 표시 */
export function HeaderAuth() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex gap-2">
        <div className="h-9 w-16 rounded-xl bg-muted animate-pulse" />
        <div className="h-9 w-14 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (session?.user) {
    return (
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
    );
  }

  return (
    <>
      <Link href="/auth/signin" className="shrink-0">
        <Button variant="outline" size="sm" className="rounded-xl font-semibold min-w-[72px]">
          로그인
        </Button>
      </Link>
      <Link href="/auth/signup" className="shrink-0">
        <Button size="sm" className="rounded-xl font-semibold btn-rainbow min-w-[56px]">
          가입
        </Button>
      </Link>
    </>
  );
}
