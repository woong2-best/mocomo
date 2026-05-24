"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { Bell, Gem } from "lucide-react";

export function HeaderAuth() {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <>
        <Button asChild variant="ghost" size="icon" title="알림" className="rounded-xl">
          <Link href="/notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1 rounded-xl hidden sm:inline-flex">
          <Link href="/support">
            <Gem className="h-4 w-4" />
            <span className="text-xs">등급</span>
          </Link>
        </Button>
        <ProfileMenu />
      </>
    );
  }

  return (
    <>
      <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold min-w-[72px] shrink-0">
        <Link href="/auth/signin">로그인</Link>
      </Button>
      <Button asChild size="sm" className="rounded-xl font-semibold btn-rainbow min-w-[56px] shrink-0">
        <Link href="/auth/signup">가입</Link>
      </Button>
    </>
  );
}
