"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe2, Home, MapPin, Sparkles, Tv } from "lucide-react";
import { completeAptMoveIn } from "@/actions/apt";
import { AptMoveInCelebration } from "@/components/apt/apt-move-in-celebration";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { Button } from "@/components/ui/button";
import { APT_DEFAULT_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import type { HousingType } from "@/lib/apt/housing-types";
import { HOUSING_TYPE_LABELS } from "@/lib/apt/housing-types";
import type { GlobePick } from "@/lib/apt/globe/globe-scene";
import {
  formatUsedRegion,
  getSigunguList,
  KOREA_SIDO,
} from "@/lib/apt/korea-region-picker";
import { cn } from "@/lib/utils";

const AptGlobePicker = dynamic(
  () => import("@/components/apt/apt-globe-picker").then((m) => m.AptGlobePicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(52dvh,420px)] items-center justify-center rounded-2xl border-2 border-[hsl(var(--folk-cobalt)/0.2)] bg-[#0a1628] text-sm text-muted-foreground">
        지구본 불러오는 중…
      </div>
    ),
  }
);

const STEPS = ["환영", "주거 형태", "위치 선택", "세부 설정", "입주"] as const;

export function AptMoveInClient({
  username,
  countryCode,
}: {
  username: string;
  countryCode: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [housingType, setHousingType] = useState<HousingType>("apartment");
  const [floor, setFloor] = useState(APT_DEFAULT_FLOOR);
  const [globePick, setGlobePick] = useState<GlobePick | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [koreaSido, setKoreaSido] = useState("seoul");
  const [koreaSigungu, setKoreaSigungu] = useState("강남구");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const isKorea = (globePick?.country.code ?? countryCode) === "KR";

  const regionLabel = useMemo(() => {
    if (isKorea && housingType === "house") {
      const sido = KOREA_SIDO.find((s) => s.id === koreaSido);
      return formatUsedRegion(sido?.short ?? "서울", koreaSigungu);
    }
    if (globePick) return `${globePick.country.nameKo} (${globePick.lat.toFixed(2)}°, ${globePick.lng.toFixed(2)}°)`;
    return "위치 미선택";
  }, [globePick, housingType, isKorea, koreaSido, koreaSigungu]);

  const onGlobePick = useCallback((p: GlobePick) => setGlobePick(p), []);

  function finish() {
    if (!globePick) {
      setError("지구본에서 위치를 선택해 주세요.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await completeAptMoveIn({
        housingType,
        homeFloor: housingType === "apartment" ? floor : undefined,
        countryCode: globePick.country.code,
        latitude: globePick.lat,
        longitude: globePick.lng,
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
    router.replace(housingType === "house" ? "/apt/house" : "/apt");
  }

  const sigunguOptions = getSigunguList(koreaSido);

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-10 pb-20 space-y-8">
        <div className="text-center space-y-3">
          <FolkSectionTitle icon="sun" className="justify-center flex items-center gap-2">
            <Globe2 className="h-7 w-7 text-folk-terracotta" />
            전 세계 주거 입주
          </FolkSectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-folk-cobalt">{username}</span>님,
            가입 시 선택한 국가({countryCode})를 기준으로 지구본에서 집 위치를 고르세요.
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
                    ? "border-folk-cobalt/30 bg-folk-cobalt/10 text-folk-cobalt"
                    : "border-border text-muted-foreground"
              )}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="folk-card p-6 space-y-5 min-h-[320px]">
          {step === 0 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-folk-cobalt/20 bg-[hsl(var(--folk-gold)/0.12)]">
                <Home className="h-10 w-10 text-folk-cobalt" />
              </div>
              <h2 className="text-lg font-bold text-folk-cobalt">전 세계 어디든 집을 지을 수 있습니다</h2>
              <ul className="text-left text-sm text-muted-foreground space-y-2 max-w-md mx-auto">
                <li className="flex gap-2"><Globe2 className="h-4 w-4 shrink-0 text-folk-terracotta" /> 지구본을 확대해 원하는 위치를 클릭</li>
                <li className="flex gap-2"><Building2 className="h-4 w-4 shrink-0 text-folk-terracotta" /> 아파트 — 사이트에서 미리 지은 건물에 입주</li>
                <li className="flex gap-2"><Home className="h-4 w-4 shrink-0 text-folk-terracotta" /> 주택 — 부지에서 직접 건설 (한국은 시·군·구 선택)</li>
                <li className="flex gap-2"><Sparkles className="h-4 w-4 shrink-0 text-folk-terracotta" /> 입주 완료 시 축하 공지가 표시됩니다</li>
              </ul>
              <Button className="w-full rounded-xl" onClick={() => setStep(1)}>다음</Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-folk-cobalt text-center">주거 형태를 선택하세요</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["apartment", "house"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHousingType(t)}
                    className={cn(
                      "rounded-2xl border-2 p-5 text-left transition-all",
                      housingType === t
                        ? "border-folk-terracotta bg-folk-terracotta/10 scale-[1.02]"
                        : "border-[hsl(var(--folk-cobalt)/0.2)] hover:bg-[hsl(var(--folk-gold)/0.08)]"
                    )}
                  >
                    {t === "apartment" ? (
                      <Building2 className="h-8 w-8 text-folk-cobalt mb-2" />
                    ) : (
                      <Home className="h-8 w-8 text-folk-cobalt mb-2" />
                    )}
                    <p className="font-bold text-folk-cobalt">{HOUSING_TYPE_LABELS[t]}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {t === "apartment"
                        ? "100층 APT 타워에 입주. 층·방 편집과 생활 시뮬레이션."
                        : "선택한 부지에 주택 건설. 한국은 시·군·구 단위 지정."}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(0)}>이전</Button>
                <Button className="flex-1 rounded-xl" onClick={() => setStep(2)}>다음</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-folk-cobalt text-center flex items-center justify-center gap-2">
                <MapPin className="h-5 w-5" />
                지구본에서 위치 선택
              </h2>
              <AptGlobePicker
                initialCountryCode={countryCode}
                onPick={onGlobePick}
                onZoomChange={setZoomLevel}
              />
              <p className="text-xs text-center text-muted-foreground">
                {zoomLevel >= 2
                  ? "부지 단위까지 확대되었습니다. 이 위치에 집이 지어집니다."
                  : "휠로 확대한 뒤 원하는 곳을 클릭하세요."}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(1)}>이전</Button>
                <Button className="flex-1 rounded-xl" onClick={() => setStep(3)} disabled={!globePick}>
                  다음
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-folk-cobalt text-center">세부 설정</h2>
              <p className="text-sm text-center text-muted-foreground">{regionLabel}</p>

              {housingType === "apartment" && (
                <div className="space-y-3">
                  <p className="text-center text-4xl font-display font-bold text-folk-terracotta tabular-nums">{floor}층</p>
                  <input
                    type="range"
                    min={1}
                    max={APT_TOTAL_FLOORS}
                    value={floor}
                    onChange={(e) => setFloor(Number(e.target.value))}
                    className="w-full accent-folk-terracotta"
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    MoCoMo APT 100층 타워 · 기본 평면도 + TV 설치
                  </p>
                </div>
              )}

              {housingType === "house" && isKorea && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">시·도</span>
                    <select
                      value={koreaSido}
                      onChange={(e) => {
                        setKoreaSido(e.target.value);
                        const list = getSigunguList(e.target.value);
                        setKoreaSigungu(list[0] ?? "");
                      }}
                      className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                    >
                      {KOREA_SIDO.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">시·군·구</span>
                    <select
                      value={koreaSigungu}
                      onChange={(e) => setKoreaSigungu(e.target.value)}
                      className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                    >
                      {sigunguOptions.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {housingType === "house" && !isKorea && (
                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                  해외 주택은 선택한 좌표 부지에 건설됩니다.
                  <br />
                  상세 건설 모드는 순차적으로 확장됩니다.
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(2)}>이전</Button>
                <Button className="flex-1 rounded-xl" onClick={() => setStep(4)}>다음</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {HOUSING_TYPE_LABELS[housingType]} · {regionLabel}
                {housingType === "apartment" && (
                  <>
                    <br />
                    <span className="text-3xl font-display font-bold text-folk-terracotta">{floor}층</span>
                  </>
                )}
              </p>
              <ul className="text-left text-xs text-muted-foreground space-y-1 max-w-sm mx-auto">
                <li className="flex gap-2"><Tv className="h-3.5 w-3.5 shrink-0" /> 아바타 생활 시뮬레이션 시작</li>
                <li className="flex gap-2"><Sparkles className="h-3.5 w-3.5 shrink-0" /> 입주 축하 공지 표시</li>
              </ul>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(3)} disabled={pending}>이전</Button>
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
        housingType={housingType}
        regionLabel={regionLabel}
        homeFloor={housingType === "apartment" ? floor : undefined}
        onClose={afterCelebration}
      />
    </>
  );
}
