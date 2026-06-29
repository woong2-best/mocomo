"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearLocalHomeData } from "@/lib/apt/local-home-store";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

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
          void signOut({ callbackUrl: DEFAULT_LANDING_PATH });
        });
      }}
    >
      <LogOut className="h-4 w-4" />
      로그아웃
    </Button>
  );
}
