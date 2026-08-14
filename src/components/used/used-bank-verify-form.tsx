"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearAccountBankPending,
  clearUsedMarketBankPending,
  sendAccountBankVerification,
  sendUsedMarketBankVerification,
  verifyAccountBankCode,
  verifyUsedMarketBankCode,
} from "@/actions/bank-verification";
import { BankSelectField } from "@/components/bank/bank-select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { Landmark, ShieldCheck } from "lucide-react";

export function UsedBankVerifyForm({
  callbackUrl = "/used/new",
  legalName,
  mode = "used",
  emailVerified = true,
}: {
  callbackUrl?: string;
  legalName?: string | null;
  /** account: 일반 설정(Stripe 미연동) · used: 중고/판매자(Stripe Connect) */
  mode?: "account" | "used";
  emailVerified?: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [bankCode, setBankCode] = useState("004");
  const [accountNum, setAccountNum] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const intro =
    mode === "account" ? (
      locale === "en" ? (
        <>
          Register your <strong className="text-foreground">Korean bank account</strong> with a 1 KRW
          deposit. The account holder must match your login name
          {legalName ? ` (${legalName})` : ""}.{" "}
          <strong className="text-foreground">One account per user</strong>, cannot be changed after
          verification. Up to <strong className="text-foreground">3 requests</strong> per day.
        </>
      ) : (
        <>
          <strong className="text-foreground">본인 명의 국내 계좌</strong>를 1원 입금으로 인증합니다.
          예금주명은 로그인 실명
          {legalName ? ` (${legalName})` : ""}과 일치해야 합니다.{" "}
          <strong className="text-foreground">계정당 계좌 하나</strong>, 인증 후 변경 불가. 하루{" "}
          <strong className="text-foreground">3회</strong>까지 요청 가능합니다.
        </>
      )
    ) : locale === "en" ? (
      <>
        Verify your <strong className="text-foreground">Korean bank account</strong> with a 1 KRW
        deposit. The account holder must match your login name
        {legalName ? ` (${legalName})` : ""}. Enter the 4-character code from your bank app memo.{" "}
        <strong className="text-foreground">One account per user</strong>. Up to{" "}
        <strong className="text-foreground">3 attempts</strong> per day.
      </>
    ) : (
      <>
        중고거래는 <strong className="text-foreground">본인 명의 한국 계좌</strong> 1원 인증 후
        이용할 수 있습니다. 예금주명은 로그인 실명
        {legalName ? ` (${legalName})` : ""}과 일치해야 합니다. 입금통장메모의{" "}
        <strong className="text-foreground">4자리 코드</strong>를 입력해 주세요.{" "}
        <strong className="text-foreground">계정당 계좌 하나</strong>, 인증 후 변경 불가. 하루{" "}
        <strong className="text-foreground">3회</strong>까지 요청 가능합니다.
      </>
    );

  const sendBank = mode === "account" ? sendAccountBankVerification : sendUsedMarketBankVerification;
  const verifyBank = mode === "account" ? verifyAccountBankCode : verifyUsedMarketBankCode;
  const clearPending = mode === "account" ? clearAccountBankPending : clearUsedMarketBankPending;

  async function requestTransfer() {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await sendBank(bankCode, accountNum);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("alreadyVerified" in res && res.alreadyVerified) {
      setMessage(res.message ?? "이미 인증된 계좌입니다.");
      router.push(callbackUrl);
      router.refresh();
      return;
    }
    setSent(true);
    const remain =
      "sendsRemaining" in res && typeof res.sendsRemaining === "number"
        ? ` (오늘 ${res.sendsRemaining}회 남음)`
        : "";
    setMessage((res.message ?? "1원을 보냈습니다.") + remain);
    if ("devCode" in res && res.devCode) setCode(res.devCode);
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await verifyBank(bankCode, accountNum, code);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("displayAccount" in res) {
      setMessage(`${res.displayAccount} 인증이 완료되었습니다.`);
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="rounded-2xl border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Landmark className="h-5 w-5 text-primary" />
          {locale === "en" ? "Bank account verification" : "계좌 1원 인증"}
        </CardTitle>
        <p className="text-sm text-muted-foreground font-normal">{intro}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <BankSelectField
          value={bankCode}
          onChange={setBankCode}
          disabled={sent && loading}
          locale={locale === "en" ? "en" : "ko"}
        />

        <Input
          placeholder={locale === "en" ? "Account number (digits only)" : "계좌번호 (- 없이)"}
          value={accountNum}
          onChange={(e) => setAccountNum(e.target.value.replace(/\D/g, ""))}
          className="rounded-xl h-11"
          inputMode="numeric"
          disabled={sent && loading}
        />

        {!sent ? (
          <Button
            type="button"
            className="w-full rounded-xl"
            onClick={requestTransfer}
            disabled={loading || accountNum.length < 8}
          >
            {loading
              ? locale === "en"
                ? "Sending…"
                : "송금 중…"
              : locale === "en"
                ? "Send 1 KRW"
                : "1원 인증 요청"}
          </Button>
        ) : (
          <form onSubmit={confirmCode} className="space-y-3">
            <Input
              placeholder={locale === "en" ? "4-char memo code" : "입금통장메모 4자리"}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))
              }
              className="rounded-xl h-11 tracking-widest text-center uppercase"
              maxLength={4}
              required
            />
            <Button
              type="submit"
              className="w-full rounded-xl gap-2"
              disabled={loading || code.length !== 4}
            >
              <ShieldCheck className="h-4 w-4" />
              {loading
                ? locale === "en"
                  ? "Verifying…"
                  : "확인 중…"
                : locale === "en"
                  ? "Verify"
                  : "인증 완료"}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground underline w-full text-center"
              onClick={() => {
                void clearPending().then((res) => {
                  if ("error" in res && res.error) {
                    setError(res.error);
                    return;
                  }
                  setSent(false);
                  setCode("");
                  setError("");
                  setMessage("");
                });
              }}
            >
              {locale === "en" ? "Change account" : "계좌 다시 입력"}
            </button>
          </form>
        )}

        {message && <p className="text-sm text-primary">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
