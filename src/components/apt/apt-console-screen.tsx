"use client";

import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Power } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsoleModePhase } from "@/lib/apt/bondee/isometric-home-scene";

const GamesHubClient = dynamic(
  () => import("@/components/games/games-hub-client").then((m) => m.GamesHubClient),
  { ssr: false }
);

type Props = {
  phase: ConsoleModePhase;
  blend: number;
  onPowerOff: () => void;
  onGameNavigate: (href: string) => void;
};

export function AptConsoleScreen({ phase, blend, onPowerOff, onGameNavigate }: Props) {
  const visible = phase === "entering" || phase === "active" || phase === "exiting";
  const screenOpacity = phase === "active" ? 1 : Math.min(1, Math.max(0, blend));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[185] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "exiting" ? 1 - blend : Math.min(1, blend * 1.4) }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/65"
            style={{ opacity: Math.min(1, blend * 1.2) }}
          />

          <div className="absolute inset-0 flex items-center justify-center px-4 py-[calc(var(--header-h)+1rem)] pointer-events-none">
            <motion.div
              className="relative w-full max-w-4xl pointer-events-auto"
              initial={{ scale: 0.82, y: 24 }}
              animate={{
                scale: phase === "active" ? 1 : 0.88 + blend * 0.12,
                y: phase === "active" ? 0 : 24 * (1 - blend),
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <div className="relative rounded-[1.25rem] border-[10px] border-neutral-900 bg-neutral-950 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-1.5 w-16 rounded-full bg-neutral-700" />
                <div className="absolute inset-x-6 top-0 h-0.5 bg-neutral-700/60" />

                <div
                  className={cn(
                    "relative m-3 overflow-hidden rounded-lg bg-black ring-1 ring-cyan-400/30",
                    "aspect-[16/10]"
                  )}
                  style={{
                    opacity: screenOpacity,
                    boxShadow: phase === "active" ? "0 0 48px rgba(56,189,248,0.35)" : "none",
                  }}
                >
                  {phase === "active" && (
                    <div className="absolute inset-0 overflow-y-auto bg-[#0c0c12]">
                      <GamesHubClient embedded onClose={onPowerOff} onGameNavigate={onGameNavigate} />
                    </div>
                  )}
                  {phase !== "active" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0a1628] to-[#111827]">
                      <div className="text-center space-y-2">
                        <div className="mx-auto h-10 w-10 rounded-full border-2 border-cyan-400/40 border-t-cyan-300 animate-spin" />
                        <p className="text-xs font-semibold text-cyan-200/80 tracking-wide">
                          {phase === "exiting" ? "전원 종료…" : "게임기 부팅 중…"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between px-4 pb-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        phase === "active" ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400 animate-pulse"
                      )}
                    />
                    <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                      MoCoMo Console
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onPowerOff}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/60 px-3 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-900/60 transition-colors"
                  >
                    <Power className="h-3.5 w-3.5" />
                    전원
                  </button>
                </div>
              </div>

              <p className="mt-3 text-center text-[10px] text-white/50 font-medium">
                의자에 앉아 게임기를 바라보는 중 · 전원 버튼으로 일어납니다
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
