import { auth } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

/**
 * 관리자 전용 로그인
 * - 메인 사이트 로그인 여부와 무관
 * - 반드시: 관리자 계정 비밀번호 → Passkey → TOTP
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const callback =
    sp.callbackUrl?.startsWith("/") &&
    !sp.callbackUrl.startsWith("//") &&
    sp.callbackUrl.startsWith("/admin")
      ? sp.callbackUrl
      : "/admin";

  return (
    <AdminLoginForm
      callbackUrl={callback}
      errorParam={sp.error ?? null}
      siteUsername={session?.user?.username ?? null}
    />
  );
}
