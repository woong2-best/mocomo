/** 라우트 전환 시 즉시 보여줄 공통 스켈레톤 */
export function RouteLoading({ narrow = false }: { narrow?: boolean }) {
  return (
    <div
      className={`p-4 lg:p-6 animate-pulse space-y-4 ${narrow ? "max-w-2xl mx-auto" : "max-w-5xl mx-auto"}`}
    >
      <div className="h-8 w-40 rounded-lg bg-muted" />
      <div className="space-y-3">
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
