"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, Gem, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function ProfileMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!session?.user) return null;

  const username = session.user.username || session.user.id;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-full hover:ring-2 hover:ring-primary/30 p-0.5"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={session.user.image} />
          <AvatarFallback>{(session.user.name || username)[0]}</AvatarFallback>
        </Avatar>
        <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-xl py-1 z-50">
          <Link
            href={`/u/${username}`}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" />내 프로필
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4" />설정
          </Link>
          <Link
            href="/support"
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <Gem className="h-4 w-4" />등급
          </Link>
          <hr className="my-1 border-border" />
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent text-destructive"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
