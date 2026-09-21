"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DOT_COUNT = 5;

/** Five dots — wave left→right: gray idle, black when active. */
export function MocoTransferWaveDots({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % (DOT_COUNT * 3);
      setPhase(step);
    }, 220);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="flex min-w-[5.5rem] flex-1 items-end justify-center gap-2 px-2" aria-hidden>
      {Array.from({ length: DOT_COUNT }, (_, i) => {
        const lit = active && phase % DOT_COUNT === i;
        const waveY = lit ? Math.sin(phase * 0.9) * 5 : Math.sin((phase + i) * 0.25) * 1.5;
        return (
          <span
            key={i}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-colors duration-150",
              lit ? "bg-neutral-950" : "bg-neutral-400",
            )}
            style={{ transform: `translateY(${waveY}px)` }}
          />
        );
      })}
    </div>
  );
}

type Props = {
  userImageUrl?: string | null;
  userLabel?: string;
  transferActive?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function MocoEarthTransferHero({
  userImageUrl,
  userLabel = "You",
  transferActive = false,
  className,
  children,
}: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-neutral-200 bg-white",
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full">
        <Image
          src="/live/moco-support-earth.png"
          alt=""
          fill
          className="object-cover object-bottom"
          priority
        />
        <div className="absolute inset-x-0 top-[36%] flex items-center justify-center gap-2 px-4">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border-[3px] border-[#1B3A6B] bg-neutral-300 shadow-sm">
            {userImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-neutral-200 text-xs font-bold text-neutral-600">
                {userLabel.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <MocoTransferWaveDots active={transferActive} />
          <Image
            src="/mocomo-logo.png"
            alt="MoCoMo"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-xl border-[3px] border-[#1B3A6B] bg-white object-contain p-1 shadow-sm"
          />
        </div>
      </div>
      {children ? <div className="border-t border-neutral-100 bg-white/95 px-4 py-3">{children}</div> : null}
    </div>
  );
}
