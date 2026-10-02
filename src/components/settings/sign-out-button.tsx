"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        void performWebSignOut({ userId });
      }}
    >
      <LogOut className="h-4 w-4" />
      {t("menu.signOut")}
    </Button>
  );
}
