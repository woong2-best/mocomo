"use client";

import { LIVE_SMPTE_COLORS } from "@/lib/live-categories";
import { cn } from "@/lib/utils";

function SteppedWings({ shade }: { shade: number }) {
  const panel = `rgb(${shade},${shade},${shade + 2})`;
  return (
    <>
      {[0, 1, 2].map((step) => (
        <div
          key={`l-${step}`}
          className="absolute rounded-[3px]"
          style={{
            left: `${4 + step * 4.5}%`,
            top: `${16 + step * 5}%`,
            width: `${15 - step * 2.5}%`,
            height: `${68 - step * 11}%`,
            backgroundColor: panel,
          }}
        />
      ))}
      {[0, 1, 2].map((step) => (
        <div
          key={`r-${step}`}
          className="absolute rounded-[3px]"
          style={{
            right: `${4 + step * 4.5}%`,
            top: `${16 + step * 5}%`,
            width: `${15 - step * 2.5}%`,
            height: `${68 - step * 11}%`,
            backgroundColor: panel,
          }}
        />
      ))}
    </>
  );
}

/** CRT + SMPTE bars on black — no baked white PNG. */
export function LiveOffAirTvGraphic({
  className,
  variant = "bars",
  message,
}: {
  className?: string;
  variant?: "bars" | "dark";
  message?: string;
}) {
  const wingShade = variant === "bars" ? 28 : 22;

  return (
    <div className={cn("relative w-full aspect-[16/10] bg-black", className)}>
      <SteppedWings shade={wingShade} />
      <div
        className={cn(
          "absolute inset-[11%_21%] overflow-hidden rounded-md bg-black",
          variant === "bars"
            ? "border border-[#a83232]/90 shadow-[0_0_14px_rgba(220,50,50,0.35),inset_0_0_24px_rgba(0,0,0,0.85)]"
            : "border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]"
        )}
      >
        {variant === "bars" ? (
          <div
            className="absolute inset-0"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${LIVE_SMPTE_COLORS.length}, minmax(0, 1fr))`,
            }}
          >
            {LIVE_SMPTE_COLORS.map((color) => (
              <div key={color} className="min-h-0 min-w-0 h-full" style={{ backgroundColor: color }} />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#141418]" />
        )}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.45) 3px)",
          }}
        />
        {message ? (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <p className="text-center text-xs font-semibold text-white/90 sm:text-sm">{message}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
