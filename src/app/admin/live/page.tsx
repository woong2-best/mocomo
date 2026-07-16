import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminLivePage() {
  return (
    <AdminPlaceholderPage
      title="라이브 관리"
      description="진행 중 라이브 모니터링 · 강제 종료 UI입니다. 실제 종료 동작은 이후 구현합니다."
      actions={[{ label: "라이브 종료" }, { label: "경고 전송" }]}
    />
  );
}
