"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBankAccount, requestPayout } from "@/actions/wallet";
import { MIN_PAYOUT_KRW } from "@/lib/settlement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LEDGER_LABELS: Record<string, string> = {
  SELLER_EARNING: "수익 적립",
  PAYOUT_REQUEST: "출금 신청",
  PAYOUT_REJECTED: "출금 반려 환급",
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
    if ("error" in res && res.error) setMsg(res.error);
    else {
      setMsg("계좌가 저장되었습니다.");
      router.refresh();
    }
  }

  async function submitPayout(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await requestPayout(Number(payoutAmount));
    setLoading(false);
    if ("error" in res && res.error) setMsg(res.error);
    else {
      setMsg("출금 신청이 접수되었습니다. 영업일 기준 3~5일 내 입금됩니다.");
      setPayoutAmount("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">정산 잔액</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-black">{withdrawable.toLocaleString()}원</p>
          <p className="text-xs text-muted-foreground">
            출금 가능 · 총 적립 {data.totalEarned.toLocaleString()}원 · 출금 완료{" "}
            {data.totalWithdrawn.toLocaleString()}원
          </p>
          {data.pendingPayout > 0 && (
            <p className="text-xs text-amber-700">처리 중 출금 {data.pendingPayout.toLocaleString()}원</p>
          )}
          <p className="text-xs text-muted-foreground pt-2">
            결제는 Stripe로 수납되며, 수익은 여기 적립 후 출금 신청 → 운영자 확인 후 계좌로
            송금됩니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">출금 계좌</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveBank} className="space-y-3">
            <Input placeholder="은행명 (예: 카카오뱅크)" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
            <Input placeholder="계좌번호" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
            <Input placeholder="예금주" value={holderName} onChange={(e) => setHolderName(e.target.value)} required />
            <Button type="submit" variant="secondary" disabled={loading}>
              계좌 저장
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">출금 신청</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPayout} className="space-y-3">
            <Input
              type="number"
              placeholder={`금액 (최소 ${MIN_PAYOUT_KRW.toLocaleString()}원)`}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              min={MIN_PAYOUT_KRW}
              max={withdrawable}
              required
            />
            <Button type="submit" variant="secondary" disabled={loading || withdrawable < MIN_PAYOUT_KRW}>
              출금 신청
            </Button>
          </form>
        </CardContent>
      </Card>

      {data.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">최근 내역</CardTitle>
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
                  {e.amount.toLocaleString()}원
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
