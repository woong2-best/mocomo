"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearUsedMarketPhonePending,
  sendUsedMarketPhoneOtp,
  verifyUsedMarketPhoneOtp,
} from "@/actions/bank-verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { phonePlaceholderForCountry } from "@/lib/phone-international";
import { usedMarketPhoneCountryLabel } from "@/lib/used-phone-countries";
import { Phone, ShieldCheck } from "lucide-react";

export function UsedPhoneVerifyForm({
  callbackUrl = "/used/new",
  countryCode = "US",
}: {
  callbackUrl?: string;
  countryCode?: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const region = countryCode.toUpperCase();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const countryLabel = usedMarketPhoneCountryLabel(region, locale);
  const intro =
    locale === "en" ? (
      <>
        Verify your mobile number for the used marketplace in{" "}
        <strong className="text-foreground">{countryLabel}</strong>. We send a 6-digit code by SMS.{" "}
        <strong className="text-foreground">One number per account</strong>.
      </>
    ) : locale === "ja" ? (
      <>
        <strong className="text-foreground">{countryLabel}</strong>
        のフリマ利用には携帯電話番号のSMS認証が必要です。
        <strong className="text-foreground">アカウントごとに1つの番号</strong>のみ使用できます。
      </>
    ) : (
      <>
        <strong className="text-foreground">{countryLabel}</strong> 중고거래 이용을 위해 휴대폰 SMS
        인증이 필요합니다. <strong className="text-foreground">계정당 번호 하나</strong>만 등록할 수
        있습니다.
      </>
    );

  async function requestOtp() {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await sendUsedMarketPhoneOtp(phone);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("alreadyVerified" in res && res.alreadyVerified) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }
    setSent(true);
    setMessage(res.message ?? "인증번호를 보냈습니다.");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await verifyUsedMarketPhoneOtp(phone, code);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function resetPending() {
    setLoading(true);
    await clearUsedMarketPhonePending();
    setSent(false);
    setCode("");
    setMessage("");
    setError("");
    setLoading(false);
  }

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          {locale === "en" ? "Phone verification" : locale === "ja" ? "携帯認証" : "휴대폰 인증"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{intro}</p>

        <form onSubmit={submitCode} className="space-y-3">
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={phonePlaceholderForCountry(region)}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={sent}
            className="rounded-xl h-11"
          />

          {sent ? (
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={locale === "en" ? "6-digit code" : "6자리 인증번호"}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="rounded-xl h-11 tracking-widest"
            />
          ) : null}

          {message ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            {!sent ? (
              <Button
                type="button"
                className="rounded-xl flex-1 gap-1"
                disabled={loading || !phone.trim()}
                onClick={() => void requestOtp()}
              >
                <ShieldCheck className="h-4 w-4" />
                {locale === "en" ? "Send code" : locale === "ja" ? "認証コード送信" : "인증번호 받기"}
              </Button>
            ) : (
              <>
                <Button type="submit" className="rounded-xl flex-1" disabled={loading || code.length < 6}>
                  {locale === "en" ? "Verify" : locale === "ja" ? "認証する" : "인증 완료"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={loading}
                  onClick={() => void resetPending()}
                >
                  {locale === "en" ? "Change number" : "번호 변경"}
                </Button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
