"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { MotionPage } from "@/components/motion/motion-primitives";
import { cn } from "@/lib/utils";

const MAX_WIDTH = {
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

export function NativePageTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isNativeApp } = useClientPlatform();
  return <div className={cn(isNativeApp && "sr-only", className)}>{children}</div>;
}

export function AppPageChrome({
  children,
  className,
  maxWidth = "lg",
  spacing = "md",
  animate = true,
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: keyof typeof MAX_WIDTH;
  spacing?: "sm" | "md";
  /** 페이지 진입·스태거 애니메이션 (기본 켜짐) */
  animate?: boolean;
}) {
  const { isNativeApp } = useClientPlatform();

  const inner = (
    <div
      className={cn(
        spacing === "sm" ? "space-y-4" : "space-y-6",
        animate && "moco-stagger"
      )}
    >
      {children}
    </div>
  );

  const usePageMotion = animate && !isNativeApp;

  return (
    <div
      className={cn(
        MAX_WIDTH[maxWidth],
        "mx-auto p-4 min-w-0",
        !isNativeApp && "pb-nav lg:pb-6",
        className
      )}
    >
      {usePageMotion ? <MotionPage>{inner}</MotionPage> : inner}
    </div>
  );
}
