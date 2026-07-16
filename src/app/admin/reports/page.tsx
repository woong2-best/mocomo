import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminReportsPage() {
  return (
    <AdminPlaceholderPage
      title="신고 관리"
      description="신고 대기열 · 처리 UI 골격입니다. 실제 처리 로직은 다음 단계에서 연결합니다."
      actions={[{ label: "신고 처리" }, { label: "기각" }, { label: "제재" }]}
    />
  );
}
