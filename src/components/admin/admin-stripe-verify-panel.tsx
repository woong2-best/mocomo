"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  startStripePremiumSmokeCheckout,
  startStripeTipSmokeCheckout,
  type StripeVerifyDashboard,
} from "@/actions/admin-stripe-verify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/money";
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <div className="flex gap-2 text-sm">
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${ok ? "text-emerald-500" : "text-destructive"}`} />
      <div>
        <p className="font-medium">{label}</p>
        {detail ? <p className="text-muted-foreground text-xs mt-0.5">{detail}</p> : null}
      </div>
    </div>
  );
}

export function AdminStripeVerifyPanel({ data }: { data: StripeVerifyDashboard }) {
  const { diagnostics: d } = data;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [receiver, setReceiver] = useState(data.creators[0]?.username ?? "");
  const [tipAmount, setTipAmount] = useState(String(100));
  const [terms, setTerms] = useState(true);

  function openCheckout(fn: () => Promise<{ checkoutUrl?: string; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        setError(errorText(res.error));
        return;
      }
      if (res.checkoutUrl) window.location.href = res.checkoutUrl;
      else setError(t("admin.checkout_url"));
    });
  }

  const modeLabel =
    d.keyMode === "test"
      ? t("admin.sk_test_pk_test")
      : d.keyMode === "live"
        ? t("admin.smqaqm4")
        : d.keyMode === "mismatch"
          ? t("admin.sz95b3c")
          : t("admin.ssh3s9");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Stripe Dashboard →{" "}
        <a
          href="https://dashboard.stripe.com/test/payments"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 hover:underline"
        >
          테스트 결제 내역 <ExternalLink className="h-3 w-3" />
        </a>
        에서 입금·후원이 보이는지 확인하세요. 앱 DB 반영은 결제 성공 페이지 또는 웹훅으로
        처리됩니다.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.seecmmz")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusRow ok={d.configured} label={t("admin.s7is06r")} detail={`모드: ${modeLabel}`} />
          <StatusRow
            ok={d.webhookSecretPresent}
            label="STRIPE_WEBHOOK_SECRET"
            detail={
              d.webhookSecretPresent
                ? t("admin.fulfillment")
                : t("admin.payments_success")
            }
          />
          <StatusRow
            ok={d.apiOk}
            label="Stripe API"
            detail={d.apiError ?? (d.apiOk ? t("admin.balance_api_ok") : undefined)}
          />
          {d.apiOk ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1 text-muted-foreground">
              <p>
                USD 잔고(테스트): 사용 가능{" "}
                {formatUsd(d.balanceAvailableUsdCents ?? 0)} · 정산 대기{" "}
                {formatUsd(d.balancePendingUsdCents ?? 0)}
              </p>
              <p>앱 URL: {data.appOrigin}</p>
            </div>
          ) : null}
          {d.keyMode === "live" ? (
            <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <p>{t("admin.s1aqi04n")}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.sgzzpd4")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-mono">{data.stripeTestCardHint}</p>
          <p className="text-xs text-muted-foreground mt-2">{data.webhookLocalHint}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.s13fpzkc")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="rounded border"
            />
            이용약관 동의 (Checkout 필수)
          </label>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              disabled={pending || !d.apiOk || !terms}
              onClick={() => openCheckout(() => startStripePremiumSmokeCheckout(terms))}
            >
              Premium 테스트 결제 ($4.99 → 플랫폼)
            </Button>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">{t("admin.tip")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tip-receiver">{t("admin.username")}</Label>
                <Input
                  id="tip-receiver"
                  list="stripe-verify-creators"
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  placeholder="username"
                />
                <datalist id="stripe-verify-creators">
                  {data.creators.map((c) => (
                    <option key={c.id} value={c.username} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tip-amount">{t("admin.usd_cents_100_1")}</Label>
                <Input
                  id="tip-amount"
                  inputMode="numeric"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !d.apiOk || !terms || !receiver.trim()}
              onClick={() =>
                openCheckout(() =>
                  startStripeTipSmokeCheckout({
                    receiverUsername: receiver,
                    amountUsdCents: parseInt(tipAmount, 10) || 100,
                    purchaseTermsAccepted: terms,
                  })
                )
              }
            >
              후원 Checkout 열기
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        결제 후{" "}
        <Link href="/admin/finance" className="text-primary hover:underline">
          매출 · 정산
        </Link>
        과 Stripe Dashboard 잔고를 함께 확인하세요.
      </p>
    </div>
  );
}
