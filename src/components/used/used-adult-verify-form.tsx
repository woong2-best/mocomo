"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { verifyUsedAdultAge } from "@/actions/used-adult-verify";
import { USED_ADULT_MIN_AGE } from "@/lib/used-youth-protection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert } from "lucide-react";

export function UsedAdultVerifyForm({
  callbackUrl,
  restrictedLabel,
}: {
  callbackUrl: string;
  restrictedLabel?: string;
}) {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await verifyUsedAdultAge({
      birthYear: Number(year),
      birthMonth: Number(month),
      birthDay: Number(day),
      agreeTerms: agree,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-amber-800 dark:text-amber-200">청소년 보호</p>
          <p className="text-muted-foreground leading-relaxed">
            {restrictedLabel
              ? `「${restrictedLabel}」 상품은 `
              : "술·담배·성인용품은 "}
            만 {USED_ADULT_MIN_AGE}세 이상만 구매·입찰·거래 문의가 가능합니다. 생년월일로 연령을
            확인합니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">출생 연도</label>
          <Input
            type="number"
            placeholder="1998"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-xl mt-1"
            required
            min={1900}
            max={new Date().getFullYear()}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">월</label>
          <Input
            type="number"
            placeholder="1"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl mt-1"
            required
            min={1}
            max={12}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">일</label>
          <Input
            type="number"
            placeholder="1"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-xl mt-1"
            required
            min={1}
            max={31}
          />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm leading-snug">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1"
        />
        <span>
          만 {USED_ADULT_MIN_AGE}세 이상이며, 주류·담배·성인용품 관련 법령을 준수하겠습니다. 허위
          정보 시 이용이 제한될 수 있습니다.
        </span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" variant="secondary" size="lg" className="w-full rounded-xl" disabled={loading}>
        {loading ? "확인 중…" : "성인 인증 완료"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        휴대폰 인증이 안 되어 있나요?{" "}
        <Link href={`/used/verify?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline">
          휴대폰 인증하기
        </Link>
      </p>
    </form>
  );
}
