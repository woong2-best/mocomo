"use client";

import { Bell, LogOut, Menu, UserRound } from "lucide-react";
import { performWebSignOut } from "@/lib/account-switch/sign-out-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AdminHeader({
  title,
  adminName,
  adminImage,
  onMenuClick,
}: {
  title: string;
  adminName: string;
  adminImage?: string | null;
  onMenuClick?: () => void;
}) {
  const initials = adminName.slice(0, 2).toUpperCase() || "AD";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-muted lg:hidden"
        onClick={onMenuClick}
        aria-label="메뉴 열기"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">MoCoMo 관리자 콘솔</p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button type="button" variant="ghost" size="icon" className="relative h-9 w-9" disabled title="알림 (준비 중)">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </Button>

        <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 py-1 pl-1 pr-3">
          <Avatar className="h-7 w-7">
            <AvatarImage src={adminImage ?? undefined} alt="" />
            <AvatarFallback className="text-[10px]">
              {adminImage ? initials : <UserRound className="h-3.5 w-3.5" />}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[120px] truncate text-xs font-medium">{adminName}</span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => void performWebSignOut({ callbackUrl: "/auth/signin" })}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">로그아웃</span>
        </Button>
      </div>
    </header>
  );
}
