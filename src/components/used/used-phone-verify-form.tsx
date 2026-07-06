"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearUsedMarketPhonePending,
  sendUsedMarketPhoneOtp,
  verifyUsedMarketPhoneOtp,
} from "@/actions/phone-verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { phonePlaceholderForCountry } from "@/lib/phone-international";
import { usedMarketPhoneCountryLabel } from "@/lib/used-phone-countries";
import { Smartphone, ShieldCheck } from "lucide-react";

export function UsedPhoneVerifyForm({
  callbackUrl = "/used/new",
  countryCode = "KR",
}: {
  callbackUrl?: string;
  countryCode?: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const countryLabel = usedMarketPhoneCountryLabel(countryCode, locale);
  const placeholder = phonePlaceholderForCountry(countryCode);

  const intro =
    locale === "en" ? (
      <>
        Verify your <strong className="text-foreground">{countryLabel}</strong> mobile number to use
        the marketplace. <strong className="text-foreground">One number per account</strong>,{" "}
        <strong className="text-foreground">one account per number</strong>. Numbers cannot be changed
        after verification. Up to <strong className="text-foreground">3 SMS requests</strong> per day.
      </>
    ) : locale === "ja" ? (
      <>
        フリマ利用には<strong className="text-foreground">{countryLabel}</strong>
        の携帯番号認証が必要です。
        <strong className="text-foreground">アカウント1つにつき番号1つ</strong>、
        <strong className="text-foreground">番号1つにつきアカウント1つ</strong>のみ。認証後の変更はできません。1日
        <strong className="text-foreground">3回</strong>までSMSを送信できます。
      </>
    ) : locale === "zh" ? (
      <>
        使用二手交易需验证<strong className="text-foreground">{countryLabel}</strong>
        手机号。<strong className="text-foreground">每个账户一个号码</strong>，
        <strong className="text-foreground">每个号码一个账户</strong>。验证后不可更改。每天最多
        <strong className="text-foreground">3次</strong>SMS。
      </>
    ) : (
      <>
        중고거래는 <strong className="text-foreground">{countryLabel}</strong> 휴대폰 번호 인증 후
        이용할 수 있습니다. <strong className="text-foreground">계정당 번호 하나</strong>,{" "}
        <strong className="text-foreground">번호당 계정 하나</strong>만 등록할 수 있으며, 인증 후에는
        번호를 변경할 수 없습니다. 인증번호는{" "}
        <strong className="text-foreground">하루 3회</strong>까지만 요청할 수 있습니다.
      </>
    );

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
    if ("alreadyVerified" in res && res.alreadyVerified) {
      setMessage(res.message ?? "이미 인증된 번호입니다.");
      router.push(callbackUrl);
      router.refresh();
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
          {locale === "en"
            ? "Phone verification"
            : locale === "ja"
              ? "携帯電話認証"
              : locale === "zh"
                ? "手机验证"
                : "휴대폰 번호 인증"}
        </CardTitle>
        <p className="text-sm text-muted-foreground font-normal">{intro}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder={placeholder}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-xl h-11"
          inputMode="tel"
          autoComplete="tel"
          disabled={sent && loading}
        />

        {!sent ? (
          <Button type="button" className="w-full rounded-xl" onClick={requestOtp} disabled={loading}>
            {loading
              ? locale === "en"
                ? "Sending…"
                : "전송 중…"
              : locale === "en"
                ? "Send code"
                : "인증번호 받기"}
          </Button>
        ) : (
          <form onSubmit={confirmOtp} className="space-y-3">
            <Input
              placeholder={locale === "en" ? "6-digit code" : "6자리 인증번호"}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="rounded-xl h-11 tracking-widest text-center"
              inputMode="numeric"
              maxLength={6}
              required
            />
            <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading || code.length !== 6}>
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
                void clearUsedMarketPhonePending().then((res) => {
                  if (res.error) {
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
              {locale === "en" ? "Change number" : "번호 다시 입력"}
            </button>
          </form>
        )}

        {message && <p className="text-sm text-primary">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
