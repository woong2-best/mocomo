"use client";

import { useEffect } from "react";
import { Building2, PartyPopper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AptMoveInCelebration({
  open,
  username,
  regionLabel,
  homeFloor,
  onClose,
}: {
  open: boolean;
  username: string;
  regionLabel: string;
  homeFloor?: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, 8000);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        className={cn(
          "folk-card relative max-w-md w-full p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-300 bg-white",
          "border-[3px] border-neutral-200 shadow-folk-lg"
        )}
        role="dialog"
        aria-labelledby="move-in-celebration-title"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
          <PartyPopper className="h-8 w-8 text-folk-terracotta" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-folk-terracotta">입주 축하 공지</p>
          <h2 id="move-in-celebration-title" className="text-xl font-bold text-folk-cobalt">
            {username}님, 환영합니다!
          </h2>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-folk-cobalt">{regionLabel}</span>
          {homeFloor != null && (
            <>
              {" "}
              <span className="font-bold text-folk-terracotta">{homeFloor}층</span>
            </>
          )}
          에{" "}
          <span className="inline-flex items-center gap-1 font-semibold text-folk-cobalt">
            <Building2 className="h-4 w-4" />
            아파트
          </span>
          입주가 완료되었습니다.
        </p>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-xs text-muted-foreground space-y-1.5">
          <p className="flex gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-folk-terracotta" />
            3D 아바타가 새 집에서 생활을 시작합니다.
          </p>
          <p>· APT에서 방 편집, TV 시청, 일상 시뮬레이션을 즐겨보세요.</p>
        </div>

        <Button className="w-full rounded-xl" onClick={onClose}>
          내 아파트로 가기
        </Button>
      </div>
    </div>
  );
}
