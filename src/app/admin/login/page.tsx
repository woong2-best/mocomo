import { auth } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const callback =
    sp.callbackUrl?.startsWith("/") && !sp.callbackUrl.startsWith("//")
      ? sp.callbackUrl
      : "/admin";

  return (
    <AdminLoginForm
      callbackUrl={callback}
      errorParam={sp.error ?? null}
      currentUsername={session?.user?.username ?? null}
    />
  );
}
