/** 라우트 전환 시 즉시 보여줄 공통 스켈레톤 */
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { cn } from "@/lib/utils";

type ChromeMaxWidth = "lg" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";

export function RouteLoading({
  narrow = false,
  chrome = false,
  maxWidth,
  variant = "default",
  className,
}: {
  narrow?: boolean;
  chrome?: boolean;
  maxWidth?: ChromeMaxWidth;
  variant?: "default" | "grid";
  className?: string;
}) {
  const resolvedMax = maxWidth ?? (narrow ? "2xl" : "5xl");
  const inner = (
    <div
      className={cn(
        "space-y-4",
        !chrome && (narrow ? "max-w-2xl mx-auto p-4 lg:p-6" : "max-w-5xl mx-auto p-4 lg:p-6"),
        !chrome ? className : undefined
      )}
    >
      <div className="h-8 w-40 rounded-lg bg-muted animate-moco-shimmer" />
      {variant === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-moco-shimmer" />
          ))}
        </div>
      ) : (
        <div className="space-y-3 moco-stagger">
          <div className="h-28 rounded-2xl bg-muted animate-moco-shimmer" />
          <div className="h-28 rounded-2xl bg-muted animate-moco-shimmer" />
          <div className="h-28 rounded-2xl bg-muted animate-moco-shimmer" />
        </div>
      )}
    </div>
  );

  if (chrome) {
    return (
      <AppPageChrome maxWidth={resolvedMax} className={className}>
        {inner}
      </AppPageChrome>
    );
  }

  return <div className="moco-enter">{inner}</div>;
}
