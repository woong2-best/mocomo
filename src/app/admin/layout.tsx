import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell/admin-shell";

/**
 * Admin 전용 레이아웃 — 일반 AppShell과 분리.
 *
 * 인증 게이트 (1차):
 * - 비로그인 → 로그인으로 리다이렉트
 * - 역할/운영자 검증은 각 기능 페이지의 requireAdmin + 이후 단계에서 강화 예정
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  const adminName =
    session.user.name?.trim() ||
    session.user.username ||
    session.user.email?.split("@")[0] ||
    "Admin";

  return (
    <AdminShell adminName={adminName} adminImage={session.user.image}>
      {children}
    </AdminShell>
  );
}
