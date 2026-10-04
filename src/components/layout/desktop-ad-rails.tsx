"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { shouldShowDesktopAdRails } from "@/lib/desktop-ad-rails";
import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";
import { useIdleCallback } from "@/hooks/use-idle-callback";
import { AdRailUnit } from "@/components/layout/ad-rail-unit";
import type { RailAdData } from "@/lib/default-ads";
import { cn } from "@/lib/utils";

type RailsPayload = { left: RailAdData[]; right: RailAdData[] };

function AdRailColumn({
  ads,
  side,
  className,
}: {
  ads: RailAdData[];
  side: "left" | "right";
  className?: string;
}) {
  if (ads.length === 0) return null;

  return (
    <aside
      className={cn(
        "pointer-events-auto flex w-[130px] flex-col gap-3",
        className
      )}
      aria-label={side === "left" ? t("layout.sste21m") : t("layout.sljnzlq")}
    >
      <div className="flex items-center justify-center gap-1.5">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/80">Ad</p>
        <Link
          href="https://mocomo.net/events/new"
          className="inline-flex h-5 w-5 items-center justify-center rounded border border-muted-foreground/30 text-muted-foreground/90 hover:bg-muted/40"
          aria-label="New event"
        >
          <Plus className="h-3 w-3" />
        </Link>
      </div>
      {ads.map((ad) => (
        <AdRailUnit key={ad.id} ad={ad} />
      ))}
    </aside>
  );
}

/**
 * 데스크톱(2xl+) 전용: 사이드바·메인·우측패널 바깥 여백에 고정 광고.
 * 프리미엄 회원·모바일·집중 화면(메시지·라이브 등)에서는 미표시.
 */
export function DesktopAdRails() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const showRails = shouldShowDesktopAdRails(pathname);
  const hasRightPanel = shouldShowRightPanel(pathname);
  const isPremium = session?.user?.premiumTier === "PREMIUM";

  const [rails, setRails] = useState<RailsPayload | null>(null);

  useIdleCallback(() => {
    if (!showRails || isPremium) {
      setRails(null);
      return;
    }
    let cancelled = false;
    const ac = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/ads/rails", { signal: ac.signal });
        const body = await res.json();
        if (cancelled || !body.ok) return;
        setRails({ left: body.left ?? [], right: body.right ?? [] });
      } catch {
        if (!cancelled) setRails(null);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [showRails, isPremium, pathname]);

  if (!showRails || isPremium || !rails) return null;
  if (rails.left.length === 0 && rails.right.length === 0) return null;

  return (
    <div className="pointer-events-none hidden 2xl:block fixed inset-0 z-[5] overflow-hidden">
      {rails.left.length > 0 && (
        <AdRailColumn
          ads={rails.left}
          side="left"
          className="absolute top-[4.5rem] left-[16.75rem]"
        />
      )}
      {rails.right.length > 0 && (
        <AdRailColumn
          ads={rails.right}
          side="right"
          className={cn(
            "absolute top-[4.5rem]",
            hasRightPanel ? "right-[calc(var(--right-panel-w)+1rem)]" : "right-4"
          )}
        />
      )}
    </div>
  );
}
