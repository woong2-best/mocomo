"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCreatorMonetizationSettings,
  updateCreatorSubscriptionPrice,
} from "@/actions/creator-monetization";
import { DEFAULT_CREATOR_SUBSCRIPTION_PRICE_KRW } from "@/lib/creator-subscription";
import { useEffect } from "react";

export function CreatorMonetizationSettings() {
  const [price, setPrice] = useState(String(DEFAULT_CREATOR_SUBSCRIPTION_PRICE_KRW));
  const [connectMessage, setConnectMessage] = useState("");
  const [connectReady, setConnectReady] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getCreatorMonetizationSettings().then((res) => {
      if ("error" in res && res.error) return;
      if ("subscriptionPriceKrw" in res && res.connect) {
        setPrice(String(res.subscriptionPriceKrw));
        setConnectMessage(res.connect.message);
        setConnectReady(res.connect.ready);
      }
    });
  }, []);

  function save() {
    setError("");
    setSaved(false);
    const priceKrw = Number(price.replace(/,/g, ""));
    if (!Number.isFinite(priceKrw)) {
      setError("올바른 가격을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await updateCreatorSubscriptionPrice(priceKrw);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">월 구독</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            구독자 전용 콘텐츠·등급(브론즈~다이아) 혜택의 기본 요금입니다. 실제 결제는 Stripe
            Subscription 연동 후 자동결제됩니다.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1 flex-1 min-w-[140px]">
              <label htmlFor="sub-price" className="text-xs font-medium text-muted-foreground">
                월 구독료 (원)
              </label>
              <Input
                id="sub-price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d,]/g, ""))}
                disabled={pending}
                className="rounded-xl"
              />
            </div>
            <Button type="button" onClick={save} disabled={pending} className="rounded-xl">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-primary">저장되었습니다.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">정산 (Stripe Connect)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{connectMessage}</p>
          <p>
            구독·유료 콘텐츠·후원 수익은 Connect 연동 후 크리에이터 계좌로 정산됩니다. Stripe
            등록 후 onboarding을 연결할 예정입니다.
          </p>
          <Button type="button" variant="outline" className="rounded-xl" disabled={!connectReady}>
            {connectReady ? "Connect 대시보드 (준비 중)" : "Connect 연동 예정"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
