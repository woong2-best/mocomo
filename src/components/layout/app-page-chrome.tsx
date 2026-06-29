"use client";

import { useClientPlatform } from "@/components/providers/client-platform-provider";
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
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: keyof typeof MAX_WIDTH;
  spacing?: "sm" | "md";
}) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div
      className={cn(
        MAX_WIDTH[maxWidth],
        "mx-auto p-4 min-w-0",
        spacing === "sm" ? "space-y-4" : "space-y-6",
        isNativeApp ? "pb-native-fab" : "pb-nav lg:pb-6",
        className
      )}
    >
      {children}
    </div>
  );
}
