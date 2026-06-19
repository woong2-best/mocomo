"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Sparkles, Tv } from "lucide-react";
import { completeAptMoveIn } from "@/actions/apt";
import { AptMoveInCelebration } from "@/components/apt/apt-move-in-celebration";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { Button } from "@/components/ui/button";
import { APT_DEFAULT_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import { findCountry } from "@/lib/apt/world/world-countries";
import { countryFlag } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

const STEPS = ["환영", "층 선택", "입주"] as const;

export function AptMoveInClient({
  username,
  countryCode,
}: {
  username: string;
  countryCode: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [floor, setFloor] = useState(APT_DEFAULT_FLOOR);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const country = useMemo(() => findCountry(countryCode) ?? findCountry("KR")!, [countryCode]);
  const regionLabel = `${country.nameKo} APT`;

  function finish() {
    setError("");
    startTransition(async () => {
      const res = await completeAptMoveIn({
        housingType: "apartment",
        homeFloor: floor,
        countryCode: country.code,
        latitude: country.lat,
        longitude: country.lng,
        regionLabel,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setCelebrate(true);
    });
  }

  function afterCelebration() {
    setCelebrate(false);
    router.replace("/apt");
  }

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-10 pb-20 space-y-8">
        <div className="text-center space-y-3">
          <FolkSectionTitle icon="sun" className="justify-center flex items-center gap-2">
            <Building2 className="h-7 w-7 text-folk-terracotta" />
            APT 입주
          </FolkSectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-folk-cobalt">{username}</span>님,
            가입 시 선택한 국가{" "}
            <span className="font-semibold text-folk-cobalt">
              {countryFlag(country.code)} {country.nameKo}
            </span>
            의 아파트에 입주합니다.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold border-2",
                i === step
                  ? "border-folk-terracotta bg-folk-terracotta/15 text-folk-terracotta"
                  : i < step
                    ? "border-neutral-300 bg-neutral-100 text-neutral-600"
                    : "border-border text-muted-foreground"
              )}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="folk-card p-6 space-y-5 min-h-[320px] bg-white">
          {step === 0 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-neutral-200 bg-white">
                <Building2 className="h-10 w-10 text-neutral-700" />
              </div>
              <h2 className="text-lg font-bold text-folk-cobalt">100층 APT 타워에 입주합니다</h2>
              <ul className="text-left text-sm text-muted-foreground space-y-2 max-w-md mx-auto">
                <li className="flex gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-folk-terracotta" />
                  가입 국가({country.nameKo}) 아파트에 자동 배정
                </li>
                <li className="flex gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-folk-terracotta" />
                  층·방 편집과 아바타 생활 시뮬레이션
                </li>
                <li className="flex gap-2">
                  <Tv className="h-4 w-4 shrink-0 text-folk-terracotta" />
                  APT에서 다른 국가 아파트도 둘러볼 수 있습니다
                </li>
              </ul>
              <Button className="w-full rounded-xl" onClick={() => setStep(1)}>
                다음
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-folk-cobalt text-center">입주 층을 선택하세요</h2>
              <p className="text-sm text-center text-muted-foreground">
                {countryFlag(country.code)} {regionLabel}
              </p>
              <p className="text-center text-4xl font-display font-bold text-folk-terracotta tabular-nums">{floor}층</p>
              <input
                type="range"
                min={1}
                max={APT_TOTAL_FLOORS}
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="w-full accent-folk-terracotta"
              />
              <p className="text-xs text-center text-muted-foreground">MoCoMo APT 100층 · 기본 평면도 + TV 설치</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(0)}>
                  이전
                </Button>
                <Button className="flex-1 rounded-xl" onClick={() => setStep(2)}>
                  다음
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {countryFlag(country.code)} {regionLabel}
                <br />
                <span className="text-3xl font-display font-bold text-folk-terracotta">{floor}층</span>
              </p>
              <ul className="text-left text-xs text-muted-foreground space-y-1 max-w-sm mx-auto">
                <li className="flex gap-2">
                  <Tv className="h-3.5 w-3.5 shrink-0" /> 아바타 생활 시뮬레이션 시작
                </li>
                <li className="flex gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" /> 입주 축하 공지 표시
                </li>
              </ul>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(1)} disabled={pending}>
                  이전
                </Button>
                <Button className="flex-1 rounded-xl" onClick={finish} disabled={pending}>
                  {pending ? "입주 처리 중…" : "입주하기"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AptMoveInCelebration
        open={celebrate}
        username={username}
        regionLabel={regionLabel}
        homeFloor={floor}
        onClose={afterCelebration}
      />
    </>
  );
}
