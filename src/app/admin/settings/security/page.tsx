import { AdminSecuritySettingsPanel } from "@/components/admin/admin-security-settings";

export const dynamic = "force-dynamic";

export default function AdminSecuritySettingsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">보안 설정</h1>
        <p className="text-sm text-muted-foreground">
          Passkey, Authenticator(TOTP), Recovery Code, Trusted Device를 관리합니다.
        </p>
      </div>
      <AdminSecuritySettingsPanel />
    </div>
  );
}
