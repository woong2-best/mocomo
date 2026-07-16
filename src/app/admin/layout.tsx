import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/shell/admin-shell";
import { AdminAccessError, getAdminActor } from "@/lib/admin/access";
import { pathPermission } from "@/lib/admin/permissions";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";

/**
 * Admin CMS 레이아웃
 * - 인증: NextAuth (Supabase Postgres + 기존 세션). Supabase Auth 미사용.
 * - 비로그인 → /admin/login
 * - 권한 없음 → /admin/login?error=forbidden
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "/admin";

  if (pathname === "/admin/forbidden" || pathname === "/admin/login") {
    return <>{children}</>;
  }

  let actor;
  try {
    actor = await getAdminActor();
  } catch (e) {
    if (e instanceof AdminAccessError && e.status === 401) {
      redirect(`/admin/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
    redirect(`/admin/login?error=forbidden&callbackUrl=${encodeURIComponent(pathname)}`);
  }

  const needed = pathPermission(pathname);
  if (needed && !actor.permissions.includes(needed)) {
    redirect("/admin/forbidden");
  }

  if (pathname === "/admin") {
    void logSiteAdminAudit({
      actorId: actor.id,
      action: "ADMIN_LOGIN",
      targetType: "admin_session",
      targetId: actor.id,
    });
  }

  return (
    <AdminShell
      adminName={actor.name?.trim() || actor.username}
      adminImage={actor.image}
      adminRole={actor.role}
      permissions={actor.permissions}
    >
      {children}
    </AdminShell>
  );
}
