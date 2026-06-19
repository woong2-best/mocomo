"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Sparkles, Tv } from "lucide-react";
import { completeAptMoveIn } from "@/actions/apt";
import { AptFloorPicker } from "@/components/apt/apt-floor-picker";
import { AptMoveInAnimation } from "@/components/apt/apt-move-in-animation";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { Button } from "@/components/ui/button";
import { APT_PENTHOUSE_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import { findCountry } from "@/lib/apt/world/world-countries";
import { countryFlag } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function AptMoveInClient({
  username,
  countryCode,
  initialHomeFloor,
  presetFromSignup = false,
}: {
  username: string;
  countryCode: string;
  initialHomeFloor?: number;
  presetFromSignup?: boolean;
}) {
  const router = useRouter();
  const hasPreset = presetFromSignup && initialHomeFloor != null;
  const [step, setStep] = useState(hasPreset ? 1 : 0);
  const [floor, setFloor] = useState(initialHomeFloor ?? 500);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showAnimation, setShowAnimation] = useState(false);

  const country = useMemo(() => findCountry(countryCode) ?? findCountry("KR")!, [countryCode]);
  const regionLabel = `${country.nameKo} APT`;

  useEffect(() => {
    if (initialHomeFloor != null) setFloor(initialHomeFloor);
  }, [initialHomeFloor]);

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
      setShowAnimation(true);
    });
  }

  function afterAnimation() {
    setShowAnimation(false);
    router.replace("/apt");
  }

  const steps = hasPreset ? (["확인", "입주"] as const) : (["환영", "층 선택", "입주"] as const);

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
            {hasPreset ? (
              <>
                {" "}
                가입 시 선택한{" "}
                <span className="font-semibold text-folk-cobalt">
                  {countryFlag(country.code)} {country.nameKo} · {floor}층
                </span>
                으로 입주합니다.
              </>
            ) : (
              <>
                {" "}
                <span className="font-semibold text-folk-cobalt">
                  {countryFlag(country.code)} {country.nameKo}
                </span>
                아파트에서 <span className="font-semibold text-folk-cobalt">빈 층</span>을 선택해 입주합니다.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {steps.map((label, i) => (
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
          {!hasPreset && step === 0 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-neutral-200 bg-white">
                <Building2 className="h-10 w-10 text-neutral-700" />
              </div>
              <h2 className="text-lg font-bold text-folk-cobalt">{APT_TOTAL_FLOORS}층 APT 타워에 입주합니다</h2>
              <ul className="text-left text-sm text-muted-foreground space-y-2 max-w-md mx-auto">
                <li className="flex gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-folk-terracotta" />
                  빈 층 선택 후 입주 · 입구에서 아바타가 집까지 이동
                </li>
                <li className="flex gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-folk-terracotta" />
                  엘리베이터 탑승 · {APT_PENTHOUSE_FLOOR}층 펜트하우스
                </li>
                <li className="flex gap-2">
                  <Tv className="h-4 w-4 shrink-0 text-folk-terracotta" />
                  입주 후 방 편집 · TV · 다른 집 방문
                </li>
              </ul>
              <Button className="w-full rounded-xl" onClick={() => setStep(1)}>
                다음
              </Button>
            </div>
          )}

          {((hasPreset && step === 0) || (!hasPreset && step === 1)) && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-folk-cobalt text-center">
                {hasPreset ? "입주 정보 확인" : "입주할 빈 층을 선택하세요"}
              </h2>
              {hasPreset ? (
                <div className="text-center space-y-2 py-4">
                  <p className="text-sm text-muted-foreground">{countryFlag(country.code)} {regionLabel}</p>
                  <p className="text-5xl font-display font-bold text-folk-terracotta tabular-nums">{floor}층</p>
                  <p className="text-xs text-muted-foreground">회원가입 시 선택한 층 · 입주 시 입구→엘리베이터 연출</p>
                </div>
              ) : (
                <AptFloorPicker
                  countryCode={country.code}
                  countryLabel={regionLabel}
                  floor={floor}
                  onFloorChange={setFloor}
                />
              )}
              <div className="flex gap-2">
                {!hasPreset && (
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(0)}>
                    이전
                  </Button>
                )}
                <Button className="flex-1 rounded-xl" onClick={() => setStep(hasPreset ? 1 : 2)}>
                  다음
                </Button>
              </div>
            </div>
          )}

          {((hasPreset && step === 1) || (!hasPreset && step === 2)) && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {countryFlag(country.code)} {regionLabel}
                <br />
                <span className="text-3xl font-display font-bold text-folk-terracotta">{floor}층</span>
              </p>
              <ul className="text-left text-xs text-muted-foreground space-y-1 max-w-sm mx-auto">
                <li className="flex gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" /> 아파트 입구 → 엘리베이터 → 내 집 연출
                </li>
                <li className="flex gap-2">
                  <Tv className="h-3.5 w-3.5 shrink-0" /> 기본 아바타 · 생활 시뮬레이션 시작
                </li>
              </ul>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setStep(hasPreset ? 0 : 1)}
                  disabled={pending}
                >
                  이전
                </Button>
                <Button className="flex-1 rounded-xl" onClick={finish} disabled={pending}>
                  {pending ? "입주 처리 중…" : "입주하기 · 입장 연출 시작"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AptMoveInAnimation
        open={showAnimation}
        username={username}
        regionLabel={regionLabel}
        homeFloor={floor}
        onComplete={afterAnimation}
      />
    </>
  );
}
