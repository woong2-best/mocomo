import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminUsersPage() {
  return (
    <AdminPlaceholderPage
      title="회원 관리"
      description="회원 목록 · 검색 · 상태 변경 화면입니다. 현재는 라우팅만 제공합니다."
      actions={[{ label: "회원 삭제" }, { label: "회원 검색" }, { label: "상태 변경" }]}
    />
  );
}
