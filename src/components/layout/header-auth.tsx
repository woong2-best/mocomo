"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import type { SupportTierLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { NotificationBellLink } from "@/components/notifications/notification-bell-link";
import { OreTierBadge } from "@/components/support/ore-tier-button";
import { SupportTierInfoPopover } from "@/components/support/support-tier-info-popover";
import { resolveProfileDisplayTier } from "@/lib/settlement-moco/balance";
import { getTierInfo } from "@/lib/tiers";
import { useLocale } from "@/components/providers/locale-provider";

export function HeaderAuth({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const { t } = useLocale();

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
          <SupportTierInfoPopover align="end" side="bottom">
            <button
              type="button"
              className="hidden sm:inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${tierInfo.labelKo} (${tierInfo.label}) · 등급 안내`}
            >
              <OreTierBadge tier={displayTier} showLabel={false} size="sm" />
            </button>
          </SupportTierInfoPopover>
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
