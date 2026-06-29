"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { Gem } from "lucide-react";
import { NotificationBellLink } from "@/components/notifications/notification-bell-link";

export function HeaderAuth({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <>
        <NotificationBellLink />
        {!compact && (
          <Button asChild variant="outline" size="sm" className="gap-1 rounded-xl hidden sm:inline-flex">
            <Link href="/support">
              <Gem className="h-4 w-4" />
              <span className="text-xs">등급</span>
            </Link>
          </Button>
        )}
        <ProfileMenu />
      </>
    );
  }

  if (compact) {
    return (
      <Button asChild variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs font-semibold">
        <Link href="/auth/signin">로그인</Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold min-w-[72px] shrink-0">
        <Link href="/auth/signin">로그인</Link>
      </Button>
      <Button asChild size="sm" className="rounded-xl font-semibold min-w-[56px] shrink-0">
        <Link href="/auth/signup">가입</Link>
      </Button>
    </>
  );
}
