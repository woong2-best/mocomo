/** 라우트 전환 시 즉시 보여줄 공통 스켈레톤 */
import { AppPageChrome } from "@/components/layout/app-page-chrome";

type ChromeMaxWidth = "lg" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";

export function RouteLoading({
  narrow = false,
  chrome = false,
  maxWidth,
}: {
  narrow?: boolean;
  chrome?: boolean;
  maxWidth?: ChromeMaxWidth;
}) {
  const resolvedMax = maxWidth ?? (narrow ? "2xl" : "5xl");
  const inner = (
    <div
      className={`animate-pulse space-y-4 ${chrome ? "" : narrow ? "max-w-2xl mx-auto p-4 lg:p-6" : "max-w-5xl mx-auto p-4 lg:p-6"}`}
    >
      <div className="h-8 w-40 rounded-lg bg-muted" />
      <div className="space-y-3">
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
      </div>
    </div>
  );

  if (chrome) {
    return <AppPageChrome maxWidth={resolvedMax}>{inner}</AppPageChrome>;
  }

  return inner;
}
