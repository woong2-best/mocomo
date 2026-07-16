"use client";

import { cn } from "@/lib/utils";

/**
 * 기존 기능 페이지용 콘텐츠 래퍼.
 * AdminShell이 이미 프레임을 제공하므로 AppPageChrome은 사용하지 않습니다.
 */
export function AdminPageChrome({
  children,
  maxWidth = "5xl",
  backHref,
  backLabel,
  title,
}: {
  children: React.ReactNode;
  maxWidth?: "lg" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
  backHref?: string;
  backLabel?: string;
  title?: React.ReactNode;
}) {
  void backHref;
  void backLabel;

  const maxClass =
    maxWidth === "lg"
      ? "max-w-lg"
      : maxWidth === "2xl"
        ? "max-w-2xl"
        : maxWidth === "3xl"
          ? "max-w-3xl"
          : maxWidth === "4xl"
            ? "max-w-4xl"
            : maxWidth === "6xl"
              ? "max-w-6xl"
              : "max-w-5xl";

  return (
    <div className={cn("mx-auto w-full space-y-4", maxClass)}>
      {title}
      {children}
    </div>
  );
}
