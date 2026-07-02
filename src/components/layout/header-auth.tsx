"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { Gem } from "lucide-react";
import { NotificationBellLink } from "@/components/notifications/notification-bell-link";
import { useLocale } from "@/components/providers/locale-provider";

export function HeaderAuth({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const { t } = useLocale();

  if (session?.user) {
    return (
      <>
        <NotificationBellLink />
        {!compact && (
          <Button asChild variant="outline" size="sm" className="gap-1 rounded-xl hidden sm:inline-flex">
            <Link href="/support">
              <Gem className="h-4 w-4" />
              <span className="text-xs">{t("nav.tier")}</span>
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
        <Link href="/auth/signin">{t("nav.signin")}</Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold min-w-[72px] shrink-0">
        <Link href="/auth/signin">{t("nav.signin")}</Link>
      </Button>
      <Button asChild size="sm" className="rounded-xl font-semibold min-w-[56px] shrink-0">
        <Link href="/auth/signup">{t("nav.signup")}</Link>
      </Button>
    </>
  );
}
