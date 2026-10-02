"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBankAccount, requestPayout } from "@/actions/wallet";
import { MIN_PAYOUT_KRW } from "@/lib/settlement";
import { formatUsd } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LEDGER_LABELS: Record<string, string> = {
  SELLER_EARNING: t("wallet.s2qvzpb"),
  PAYOUT_REQUEST: t("wallet.s18kcjnl"),
  PAYOUT_REJECTED: t("wallet.s1a8a4up"),
};

type WalletData = Awaited<ReturnType<typeof import("@/actions/wallet").getMyWallet>>;

export function WalletDashboard({ data }: { data: WalletData }) {
  const router = useRouter();
  const [bankName, setBankName] = useState(data.bank?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(data.bank?.accountNumber ?? "");
  const [holderName, setHolderName] = useState(data.bank?.holderName ?? "");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const withdrawable = Math.max(0, data.availableBalance - data.pendingPayout);

  async function saveBank(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await saveBankAccount({ bankName, accountNumber, holderName });
    setLoading(false);
    if ("error" in res && res.error) setMsg(errorText(res.error));
    else {
      setMsg(t("wallet.s1i8m6ka"));
      router.refresh();
    }
  }

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await requestPayout(Number(payoutAmount));
    setLoading(false);
    if ("error" in res && res.error) setMsg(errorText(res.error));
    else {
      setMsg(t("wallet.3_5"));
      setPayoutAmount("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("wallet.spb20r6")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-black">{formatUsd(withdrawable)}</p>
          <p className="text-xs text-muted-foreground">
            {t("wallet.dashboard.summary", {
              earned: formatUsd(data.totalEarned),
              withdrawn: formatUsd(data.totalWithdrawn),
            })}
          </p>
          {data.pendingPayout > 0 && (
            <p className="text-xs text-amber-700">{t("wallet.dashboard.pendingPayout", { amount: formatUsd(data.pendingPayout) })}</p>
          )}
          <p className="text-xs text-muted-foreground pt-2">
            {t("wallet.stripe_8")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("wallet.s18k8rgc")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveBank} className="space-y-3">
            <Input placeholder={t("wallet.s86jroo")} value={bankName} onChange={(e) => setBankName(e.target.value)} required />
            <Input placeholder={t("wallet.smmrdvc")} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
            <Input placeholder={t("wallet.stux30")} value={holderName} onChange={(e) => setHolderName(e.target.value)} required />
            <Button type="submit" variant="secondary" disabled={loading}>
              {t("wallet.s1pjxny5")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("wallet.s18kcjnl")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPayout} className="space-y-3">
            <Input
              type="number"
              placeholder={t("wallet.s7lcllm", { v0: formatUsd(MIN_PAYOUT_KRW) })}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              min={MIN_PAYOUT_KRW}
              max={withdrawable}
              required
            />
            <Button type="submit" variant="secondary" disabled={loading || withdrawable < MIN_PAYOUT_KRW}>
              {t("wallet.s18kcjnl")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {data.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("wallet.s17kux89")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recent.map((e) => (
              <div key={e.id} className="flex justify-between border-b border-border/50 py-2 last:border-0">
                <span className="text-muted-foreground">
                  {LEDGER_LABELS[e.type] ?? e.type}
                  {e.memo ? ` · ${e.memo}` : ""}
                </span>
                <span className={e.type === "PAYOUT_REQUEST" ? "text-amber-700" : "text-foreground font-medium"}>
                  {e.type === "PAYOUT_REQUEST" ? "-" : "+"}
                  {formatUsd(e.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {msg && <p className="text-sm text-center">{msg}</p>}
    </div>
  );
}
