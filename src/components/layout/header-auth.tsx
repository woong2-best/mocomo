"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import type { SupportTierLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { NotificationBellLink } from "@/components/notifications/notification-bell-link";
import { OreIcon } from "@/components/support/ore-icon";
import { resolveProfileDisplayTier } from "@/lib/settlement-moco/balance";
import { getTierInfo, SUPPORT_TIERS_PAGE_PATH } from "@/lib/tiers";
import { useLocale } from "@/components/providers/locale-provider";

function HeaderAuthPending({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <div
        className="h-8 w-16 shrink-0 rounded-full bg-muted/60 animate-pulse"
        aria-hidden
      />
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 shrink-0"
      aria-busy="true"
      aria-label="Loading session"
    >
      <div className="h-8 w-[72px] rounded-xl bg-muted/60 animate-pulse" aria-hidden />
      <div className="h-8 w-[56px] rounded-xl bg-muted/60 animate-pulse" aria-hidden />
    </div>
  );
}

export function HeaderAuth({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();
  const { t } = useLocale();

  if (status === "loading") {
    return <HeaderAuthPending compact={compact} />;
  }

  if (session?.user) {
    const displayTier = resolveProfileDisplayTier(
      (session.user.supportTierSent ?? "SEED") as SupportTierLevel,
      (session.user.earnedMocoTier ?? "SEED") as SupportTierLevel
    );
    const tierInfo = getTierInfo(displayTier);

    return (
      <>
        <NotificationBellLink />
        {!compact && (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-xl hidden sm:inline-flex"
            aria-label={`${tierInfo.labelKo} (${tierInfo.label}) · 광석 등급`}
          >
            <Link href={SUPPORT_TIERS_PAGE_PATH}>
              <OreIcon tier={displayTier} size={20} />
            </Link>
          </Button>
        )}
        <ProfileMenu displayTier={displayTier} />
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
