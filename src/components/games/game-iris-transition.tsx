"use client";

import { motion } from "framer-motion";
import { useCallback, useState } from "react";

export type IrisPhase = "idle" | "closing" | "opening";

const IRIS_MS = 560;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function GameIrisOverlay({ phase }: { phase: IrisPhase }) {
  if (phase === "idle") return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none" aria-hidden>
      <motion.div
        className="absolute inset-0 bg-[#0a0a0a]"
        initial={
          phase === "closing"
            ? { clipPath: "circle(150% at 50% 50%)" }
            : { clipPath: "circle(0% at 50% 50%)" }
        }
        animate={
          phase === "closing"
            ? { clipPath: "circle(0% at 50% 50%)" }
            : { clipPath: "circle(150% at 50% 50%)" }
        }
        transition={{ duration: IRIS_MS / 1000, ease: [0.45, 0.05, 0.2, 1] }}
      />
    </div>
  );
}

/** 동물의 숲 스타일 원형 전환 — 닫힘 → 작업 → 열림 */
export function useGameIrisTransition() {
  const [phase, setPhase] = useState<IrisPhase>("idle");

  const runWithIris = useCallback(async (action: () => void | Promise<void>) => {
    setPhase("closing");
    await wait(IRIS_MS);
    await action();
    await wait(80);
    setPhase("opening");
    await wait(IRIS_MS);
    setPhase("idle");
  }, []);

  return { phase, runWithIris, IrisOverlay: () => <GameIrisOverlay phase={phase} /> };
}
