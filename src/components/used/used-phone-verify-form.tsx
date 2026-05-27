"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  sendUsedMarketPhoneOtp,
  verifyUsedMarketPhoneOtp,
} from "@/actions/phone-verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, ShieldCheck } from "lucide-react";

export function UsedPhoneVerifyForm({ callbackUrl = "/used/new" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp() {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await sendUsedMarketPhoneOtp(phone);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSent(true);
    const remain =
      "sendsRemaining" in res && typeof res.sendsRemaining === "number"
        ? ` (오늘 ${res.sendsRemaining}회 남음)`
        : "";
    setMessage((res.message ?? "인증번호를 보냈습니다.") + remain);
    if (res.devCode) setCode(res.devCode);
  }

  async function confirmOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await verifyUsedMarketPhoneOtp(phone, code);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage(`${res.displayPhone} 인증이 완료되었습니다.`);
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="rounded-2xl border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5 text-primary" />
          휴대폰 번호 인증
        </CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          중고거래는 <strong className="text-foreground">대한민국 휴대폰 번호</strong> 인증 후 이용할 수
          있습니다. <strong className="text-foreground">번호 하나당 계정 하나</strong>만 등록할 수 있으며, 인증번호는{" "}
          <strong className="text-foreground">하루 3회</strong>까지만 요청할 수 있습니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="010-1234-5678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-xl h-11"
          inputMode="tel"
          autoComplete="tel"
          disabled={sent && loading}
        />

        {!sent ? (
          <Button type="button" className="w-full rounded-xl" onClick={requestOtp} disabled={loading}>
            {loading ? "전송 중…" : "인증번호 받기"}
          </Button>
        ) : (
          <form onSubmit={confirmOtp} className="space-y-3">
            <Input
              placeholder="6자리 인증번호"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="rounded-xl h-11 tracking-widest text-center"
              inputMode="numeric"
              maxLength={6}
              required
            />
            <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading || code.length !== 6}>
              <ShieldCheck className="h-4 w-4" />
              {loading ? "확인 중…" : "인증 완료"}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground underline w-full text-center"
              onClick={() => {
                setSent(false);
                setCode("");
              }}
            >
              번호 다시 입력
            </button>
          </form>
        )}

        {message && <p className="text-sm text-primary">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
