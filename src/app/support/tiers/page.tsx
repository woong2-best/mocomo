import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatTierThreshold,
  getNextTierInfo,
  getTierDetailProgress,
  getTierInfo,
  parseSupportTierSlug,
  supportTierPath,
  tierFromAmount,
  SUPPORT_TIERS,
} from "@/lib/tiers";
import { listCreatorsISupportedAtTier } from "@/lib/creator-support";
import { OreIcon } from "@/components/support/ore-icon";
import { OreTierButton } from "@/components/support/ore-tier-button";
import { SupportTierSupportedUsers } from "@/components/support/support-tier-supported-users";
import { SupportPageChrome, SupportPageTitle } from "@/components/support/support-page-chrome";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function SupportTiersPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const selectedTier = parseSupportTierSlug(params.tier ?? "");
  let total = 0;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { totalSupportSent: true },
    });
    total = user?.totalSupportSent ?? 0;
  }

  const level = tierFromAmount(total);
  const info = getTierInfo(level);
  const progress = session?.user?.id ? getTierDetailProgress(level, total) : null;
  const nextTier = session?.user?.id ? getNextTierInfo(total) : null;
  const supportedUsers =
    session?.user?.id && selectedTier
      ? await listCreatorsISupportedAtTier(session.user.id, selectedTier)
      : [];

  return (
    <SupportPageChrome>
      <SupportPageTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/support" aria-label={t("common.back")}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-bold">{t("app.support.s1psfbu4")}</h1>
        </div>
      </SupportPageTitle>

      <section className="flex flex-col items-center text-center pt-2 pb-4">
        <div
          className="relative flex items-center justify-center rounded-full p-6 mb-4"
          style={{
            background: `radial-gradient(circle, ${info.color}22 0%, transparent 70%)`,
          }}
        >
          <OreIcon tier={level} size={160} className="drop-shadow-lg" />
        </div>
        <p className="text-2xl font-bold" style={{ color: info.color }}>
          {info.label}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">{info.labelKo}</p>
        <p className="text-base font-semibold mt-3 tabular-nums">
          {formatTierThreshold(info.minAmount)}
        </p>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm">
          프로필 등급은 다른 사용자에게 후원한 누적 MOCO 기준입니다. 라이브 닉네임 옆 등급은 그 스트리머에게 후원한 금액만 반영합니다.
        </p>
      </section>

      {session?.user?.id && progress ? (
        <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <div className="flex justify-between text-sm items-center gap-3">
            <span className="text-muted-foreground">My lifetime tips</span>
            {nextTier ? (
              <span className="shrink-0" title={nextTier.labelKo}>
                <OreIcon tier={nextTier.level} size={32} />
              </span>
            ) : (
              <span className="shrink-0 opacity-80" title={t("app.support.s17fu66s")}>
                <OreIcon tier={level} size={32} />
              </span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.round(progress.progress * 100)}%`,
                backgroundColor: info.color,
              }}
            />
          </div>
          <p className="text-sm font-medium text-center">{progress.message}</p>
        </section>
      ) : (
        <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          <p>{t("app.support.s74l8tp")}</p>
          <Button variant="secondary" size="sm" className="mt-3" asChild>
            <Link href="/auth/signin?callbackUrl=%2Fsupport%2Ftiers">Please sign in to continue.</Link>
          </Button>
        </section>
      )}

      {selectedTier && session?.user?.id ? (
        <SupportTierSupportedUsers tier={selectedTier} users={supportedUsers} />
      ) : selectedTier && !session?.user?.id ? (
        <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          후원한 유저를 보려면 로그인해 주세요.
        </section>
      ) : null}

      <section className="space-y-2 pt-2">
        <p className="text-sm font-semibold text-muted-foreground px-1">All tiers</p>
        <p className="text-xs text-muted-foreground px-1">
          티어를 누르면 그 등급으로 후원한 유저가 보입니다. Seed는 0보다 크고 10 MOCO 미만만 포함됩니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUPPORT_TIERS.map((tierDef) => (
            <Link key={tierDef.level} href={supportTierPath(tierDef.level)} className="min-w-0">
              <OreTierButton
                tier={tierDef.level}
                showAmount
                active={tierDef.level === (selectedTier ?? level)}
                className="w-full"
              />
            </Link>
          ))}
        </div>
      </section>
    </SupportPageChrome>
  );
}
