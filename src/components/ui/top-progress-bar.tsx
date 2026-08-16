"use client";

import { useEffect, useState } from "react";
import { TOP_PROGRESS_IDLE, topProgress, type TopProgressSnapshot } from "@/lib/top-progress";

/**
 * Fixed top loading bar — X blue, 3px, CSS-smoothed width (no JS stutter).
 */
export function TopProgressBar() {
  const [snap, setSnap] = useState<TopProgressSnapshot>(TOP_PROGRESS_IDLE);

  useEffect(() => {
    setSnap(topProgress.snapshot());
    return topProgress.subscribe(() => setSnap(topProgress.snapshot()));
  }, []);

  const { active, progress, fading } = snap;
  if (!active && progress === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[99999] h-[3px] overflow-hidden"
    >
      <div
        style={{
          height: "100%",
          width: "100%",
          backgroundColor: "#1D9BF0",
          transformOrigin: "left center",
          transform: `scaleX(${Math.max(0.02, progress)})`,
          opacity: fading || !active ? 0 : 1,
          transition: fading
            ? "opacity 200ms ease-out"
            : "transform 450ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease-out",
          willChange: "transform, opacity",
        }}
      />
    </div>
  );
}
