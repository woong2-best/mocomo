import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatUsd } from "@/lib/money";
import {
  getTierDetailProgress,
  getTierInfo,
  parseSupportTierSlug,
  supportTierPath,
  SUPPORT_TIERS,
} from "@/lib/tiers";
import { OreIcon } from "@/components/support/ore-icon";
import { OreTierButton } from "@/components/support/ore-tier-button";
import { SupportPageChrome, SupportPageTitle } from "@/components/support/support-page-chrome";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function SupportTierDetailPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier: tierSlug } = await params;
  const level = parseSupportTierSlug(tierSlug);
  if (!level) notFound();

  const info = getTierInfo(level);
  const session = await auth();
  let total = 0;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { totalSupportSent: true },
    });
    total = user?.totalSupportSent ?? 0;
  }
  const progress = session?.user?.id ? getTierDetailProgress(level, total) : null;

  return (
    <SupportPageChrome>
      <SupportPageTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/support" aria-label="뒤로">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-bold">광석 등급</h1>
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
          {info.minAmount === 0 ? `${formatUsd(0)}~` : `${formatUsd(info.minAmount)}~`}
        </p>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm">
          사이트 전체 누적 후원(보낸 금액) 기준 등급입니다.
        </p>
      </section>

      {session?.user?.id && progress ? (
        <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">내 누적 후원</span>
            <span className="font-semibold tabular-nums">{formatUsd(total)}</span>
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
          <p>로그인하면 다음 광석까지 남은 금액을 확인할 수 있습니다.</p>
          <Button variant="secondary" size="sm" className="mt-3" asChild>
            <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(supportTierPath(level))}`}>
              로그인
            </Link>
          </Button>
        </section>
      )}

      <section className="space-y-2 pt-2">
        <p className="text-sm font-semibold text-muted-foreground px-1">전체 등급</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUPPORT_TIERS.map((t) => (
            <OreTierButton
              key={t.level}
              tier={t.level}
              showAmount
              linkToDetail
              active={t.level === level}
              className="w-full"
            />
          ))}
        </div>
      </section>
    </SupportPageChrome>
  );
}

export function generateStaticParams() {
  return SUPPORT_TIERS.map((t) => ({ tier: t.level.toLowerCase() }));
}
