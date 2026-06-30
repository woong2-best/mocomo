"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { cn } from "@/lib/utils";

type PageErrorStateProps = {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  variant?: "default" | "destructive" | "muted";
  onRetry?: () => void;
  retryLabel?: string;
  primaryHref?: string;
  primaryLabel?: string;
  primaryOnClick?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
  maxWidth?: "lg" | "2xl" | "3xl";
  className?: string;
};

export function PageErrorState({
  title,
  description,
  icon: Icon = AlertCircle,
  variant = "default",
  onRetry,
  retryLabel = "다시 시도",
  primaryHref,
  primaryLabel,
  primaryOnClick,
  secondaryHref,
  secondaryLabel,
  className,
}: PageErrorStateProps) {
  const iconClass =
    variant === "destructive"
      ? "text-destructive"
      : variant === "muted"
        ? "text-muted-foreground opacity-70"
        : "text-primary";

  const cardClass =
    variant === "destructive"
      ? "border-destructive/30 bg-destructive/10"
      : variant === "muted"
        ? "border-border/60 bg-muted/30"
        : "border-border/60 bg-card";

  return (
    <div className={cn("flex flex-col items-center gap-4 py-12 text-center sm:py-16", className)}>
      <div className={cn("rounded-2xl border p-6 w-full max-w-md space-y-4", cardClass)}>
        <Icon className={cn("h-10 w-10 mx-auto", iconClass)} />
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && (
            <div className="text-sm text-muted-foreground leading-relaxed">{description}</div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {onRetry && (
            <Button type="button" variant="secondary" className="rounded-xl" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {primaryOnClick && primaryLabel ? (
            <Button type="button" className="rounded-xl" onClick={primaryOnClick}>
              {primaryLabel}
            </Button>
          ) : (
            primaryHref &&
            primaryLabel && (
              <Button asChild className="rounded-xl">
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
            )
          )}
          {secondaryHref && secondaryLabel && secondaryHref !== primaryHref && (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 네이티브·웹 공통 오류 화면 (error boundary, 클라이언트 전용) */
export function AppErrorState(props: PageErrorStateProps) {
  return (
    <AppPageChrome maxWidth={props.maxWidth ?? "lg"} spacing="sm">
      <PageErrorState {...props} />
    </AppPageChrome>
  );
}
