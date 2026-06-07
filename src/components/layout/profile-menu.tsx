"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, Gem, LogOut, ChevronDown } from "lucide-react";

export function ProfileMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const username = session.user.username || session.user.id;

  return (
    <div className="relative z-[2] flex items-center shrink-0">
      <Link
        href={`/u/${username}`}
        className="rounded-full p-0.5 hover:shadow-[0_0_0_2px_hsl(var(--primary)/0.35)]"
        aria-label="내 프로필로 이동"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={session.user.image} />
          <AvatarFallback>{(session.user.name || username)[0]}</AvatarFallback>
        </Avatar>
      </Link>

      <DropdownMenu modal>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="p-1 rounded-md hover:bg-accent/80 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="계정 메뉴"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" collisionPadding={8}>
          <DropdownMenuItem asChild>
            <Link href={`/u/${username}`}>
              <User className="h-4 w-4 shrink-0" />
              내 프로필
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4 shrink-0" />
              설정
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/support">
              <Gem className="h-4 w-4 shrink-0" />
              등급
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
