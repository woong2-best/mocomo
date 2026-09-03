import Link from "next/link";
import { MARKET_UNAVAILABLE_EN, MARKET_UNAVAILABLE_KO } from "@/lib/marketplace/market-access";

export function MarketRegionUnavailable({
  locale = "ko",
  compact = false,
}: {
  locale?: "ko" | "en";
  compact?: boolean;
}) {
  const message = locale === "en" ? MARKET_UNAVAILABLE_EN : MARKET_UNAVAILABLE_KO;

  if (compact) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
        {message}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm space-y-4">
      <h2 className="text-lg font-semibold">
        {locale === "en" ? "Marketplace unavailable" : "마켓플레이스 이용 불가"}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        {locale === "en" ? "Back to community" : "커뮤니티로 돌아가기"}
      </Link>
    </div>
  );
}
