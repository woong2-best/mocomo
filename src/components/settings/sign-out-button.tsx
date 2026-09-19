"use client";

import { useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearLocalHomeData } from "@/lib/apt/local-home-store";
import { performWebSignOut } from "@/lib/account-switch/sign-out-client";

export function SignOutButton({ className }: { className?: string }) {
  const { data: session } = useSession();
  if (!session?.user) return null;

  return (
    <Button
      type="button"
      variant="destructive"
      className={className}
      onClick={() => {
        const userId = session.user.id;
        void clearLocalHomeData(userId).finally(() => {
          // Land on account picker (or /auth/signin) — do not keep a stale home session UI.
          void performWebSignOut({ userId });
        });
      }}
    >
      <LogOut className="h-4 w-4" />
      로그아웃
    </Button>
  );
}
