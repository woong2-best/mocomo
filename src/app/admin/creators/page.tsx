import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminCreatorsPage() {
  return (
    <AdminPlaceholderPage
      title="크리에이터 관리"
      description="다음 단계에서 크리에이터 승인·등급 CRUD를 같은 CMS 모듈 패턴으로 연결합니다. 권한(creators)은 이미 적용됩니다."
      actions={[{ label: "크리에이터 승인" }, { label: "등급 변경" }]}
    />
  );
}
