import { AdminPlaceholderPage } from "@/components/admin/shell/admin-placeholder-page";

export default function AdminCommunitiesPage() {
  return (
    <AdminPlaceholderPage
      title="커뮤니티 관리"
      description="커뮤니티·채널 모더레이션 화면 골격입니다."
      actions={[{ label: "커뮤니티 잠금" }, { label: "게시글 숨김" }]}
    />
  );
}
