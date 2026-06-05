/** 전역 전환 로딩 — 피드 스켈레톤은 홈 Suspense에만 두고, 로그인 등에서 멈춘 것처럼 보이지 않게 */
export default function RootLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
