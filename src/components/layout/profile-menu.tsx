"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { performWebSignOut } from "@/lib/account-switch/sign-out-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, ChevronDown, Users } from "lucide-react";
import { AccountSwitcherDialog } from "@/components/auth/account-switcher-dialog";
import { useLocale } from "@/components/providers/locale-provider";

export function ProfileMenu() {
  const { data: session } = useSession();
  const { t } = useLocale();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  if (!session?.user) return null;

  const displayName = session.user.name || session.user.username || session.user.id;

  const handleSignOut = () => {
    const userId = session.user.id;
    void performWebSignOut({ userId });
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="relative z-[2] flex items-center gap-0.5 shrink-0 rounded-full p-0.5 hover:bg-accent/80 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("accountSwitch.menuAria")}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image} />
              <AvatarFallback>{displayName[0]}</AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" collisionPadding={12} className="z-[250] w-56">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setSwitcherOpen(true);
            }}
          >
            <Users className="h-4 w-4 shrink-0" />
            {t("accountSwitch.title")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4 shrink-0" />
              {t("nav.settings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={handleSignOut}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t("menu.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AccountSwitcherDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </>
  );
}
