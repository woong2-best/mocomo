"use client";

import { useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { performWebSignOut } from "@/lib/account-switch/sign-out-client";
import { useLocale } from "@/components/providers/locale-provider";

export function SignOutButton({ className }: { className?: string }) {
  const { data: session } = useSession();
  const { t } = useLocale();
  if (!session?.user) return null;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="destructive"
        className={className}
        onClick={() => {
          void performWebSignOut({ userId: session.user.id, scope: "this" });
        }}
      >
        <LogOut className="h-4 w-4" />
        {t("accountSwitch.logoutThis")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => {
          if (!window.confirm(t("accountSwitch.logoutAllConfirm"))) return;
          void performWebSignOut({ scope: "device", autoSwitch: false });
        }}
      >
        {t("accountSwitch.logoutAll")}
      </Button>
    </div>
  );
}
