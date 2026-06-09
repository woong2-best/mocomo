"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FolkMoonFace, FolkSunFace } from "@/components/brand/folk-sun-moon";
import { cn } from "@/lib/utils";

/** 라이트 모드: 태양 · 다크 모드: 달 — 동시에 표시되지 않음 */
export function FolkThemeCelestial({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span
        className={cn("inline-block shrink-0", className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  if (isDark) {
    return <FolkMoonFace size={size} className={className} />;
  }

  return <FolkSunFace size={size} className={className} />;
}
