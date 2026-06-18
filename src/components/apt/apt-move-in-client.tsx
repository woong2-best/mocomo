"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Home, Sparkles, Tv } from "lucide-react";
import { completeAptMoveIn } from "@/actions/apt";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { Button } from "@/components/ui/button";
import { APT_DEFAULT_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import { cn } from "@/lib/utils";

const STEPS = ["환영", "층 선택", "입주 완료"] as const;

export function AptMoveInClient({ username }: { username: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [floor, setFloor] = useState(APT_DEFAULT_FLOOR);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function finish() {
    setError("");
    startTransition(async () => {
      const res = await completeAptMoveIn(floor);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.replace("/apt");
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 pb-20 space-y-8">
      <div className="text-center space-y-3">
        <FolkSectionTitle icon="sun" className="justify-center flex items-center gap-2">
          <Building2 className="h-7 w-7 text-folk-terracotta" />
          APT 입주 안내
        </FolkSectionTitle>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-folk-cobalt">{username}</span>님, MoCoMo APT에 오신 것을 환영합니다.
          <br />
          3D 아바타가 집안을 돌아다니며 생활하는 시뮬레이션이 시작됩니다.
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-bold border-2",
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

      <div className="folk-card p-6 space-y-5 min-h-[280px]">
        {step === 0 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-folk-cobalt/20 bg-[hsl(var(--folk-gold)/0.12)]">
              <Home className="h-10 w-10 text-folk-cobalt" />
            </div>
            <h2 className="text-lg font-bold text-folk-cobalt">나만의 집에 입주하세요</h2>
            <ul className="text-left text-sm text-muted-foreground space-y-2 max-w-sm mx-auto">
              <li className="flex gap-2"><Sparkles className="h-4 w-4 shrink-0 text-folk-terracotta" /> 3D 아바타가 방마다 이동하며 생활합니다</li>
              <li className="flex gap-2"><Tv className="h-4 w-4 shrink-0 text-folk-terracotta" /> TV·가구 설치 후 시청·휴식 활동</li>
              <li className="flex gap-2"><Building2 className="h-4 w-4 shrink-0 text-folk-terracotta" /> 요리·청소·수면 등 일상 시뮬레이션</li>
            </ul>
            <Button className="w-full rounded-xl" onClick={() => setStep(1)}>다음</Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-folk-cobalt text-center">거주할 층을 선택하세요</h2>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {Array.from({ length: APT_TOTAL_FLOORS }, (_, i) => i + 1).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFloor(f)}
                  className={cn(
                    "rounded-xl border-2 py-2.5 text-sm font-bold transition-all",
                    floor === f
                      ? "border-folk-terracotta bg-folk-terracotta/15 text-folk-terracotta scale-105"
                      : "border-[hsl(var(--folk-cobalt)/0.2)] hover:bg-[hsl(var(--folk-gold)/0.1)]"
                  )}
                >
                  {f}층
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              기본 평면도(현관·주방·화장실 고정)와 TV가 설치됩니다.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(0)}>이전</Button>
              <Button className="flex-1 rounded-xl" onClick={() => setStep(2)}>다음</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center">
            <p className="text-5xl font-display font-bold text-folk-terracotta tabular-nums">{floor}층</p>
            <p className="text-sm text-muted-foreground">
              입주를 완료하면 아바타가 집안을 돌아다니며
              <br />
              요리·청소·TV 시청 등 생활을 시작합니다.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(1)} disabled={pending}>이전</Button>
              <Button className="flex-1 rounded-xl" onClick={finish} disabled={pending}>
                {pending ? "입주 처리 중…" : "입주하기"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
