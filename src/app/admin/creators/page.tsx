import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminCreatorsPage() {
  return (
    <AdminPlaceholderPage
      title="크리에이터 관리"
      description="크리에이터 승인 · 등급 · 구독 설정 등을 관리합니다. 현재는 UI 골격만 제공합니다."
      actions={[{ label: "크리에이터 승인" }, { label: "등급 변경" }]}
    />
  );
}
