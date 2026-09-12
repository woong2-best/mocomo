"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { purchaseEventSponsoredAd } from "@/actions/sponsored-ad";
import { Button } from "@/components/ui/button";
import {
  calcSponsoredAdMoco,
  SPONSORED_AD_MAX_DAYS,
  SPONSORED_AD_MOCO_PER_DAY,
} from "@/lib/sponsored-ad/constants";

export function EventSponsoredAdMocoPay({
  eventId,
  defaultDays,
  purchasedMoco,
  onSuccess,
}: {
  eventId: string;
  defaultDays: number;
  purchasedMoco: number;
  onSuccess: () => void;
}) {
  const [days, setDays] = useState(Math.min(Math.max(defaultDays, 1), SPONSORED_AD_MAX_DAYS));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mocoCost = useMemo(() => {
    try {
      return calcSponsoredAdMoco(days);
    } catch {
      return null;
    }
  }, [days]);

  const canAfford = mocoCost != null && purchasedMoco >= mocoCost;

  async function onPay() {
    setError("");
    setLoading(true);
    try {
      const res = await purchaseEventSponsoredAd(eventId, days);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">MOCO로 스폰서드 광고</p>
        <p className="text-xs text-muted-foreground">
          24시간(1일)당 {SPONSORED_AD_MOCO_PER_DAY} MOCO · purchasedMoco에서 즉시 차감 · 피드·배너 노출
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground shrink-0" htmlFor="sponsored-ad-days">
          노출 일수
        </label>
        <input
          id="sponsored-ad-days"
          type="number"
          min={1}
          max={SPONSORED_AD_MAX_DAYS}
          value={days}
          onChange={(e) => setDays(Number.parseInt(e.target.value, 10) || 1)}
          className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
        <span className="text-sm text-foreground">
          = <strong>{mocoCost ?? "—"}</strong> MOCO
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        보유 purchasedMoco: {purchasedMoco.toLocaleString()}
        {!canAfford && mocoCost != null && (
          <>
            {" "}
            ·{" "}
            <Link href="/wallet" className="text-[#A855F7] underline-offset-2 hover:underline">
              충전하기
            </Link>
          </>
        )}
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl border-[#A855F7]/40"
        disabled={loading || !canAfford || mocoCost == null}
        onClick={onPay}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            처리 중…
          </>
        ) : (
          `${mocoCost ?? 0} MOCO로 광고 시작`
        )}
      </Button>
    </div>
  );
}
