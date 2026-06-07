"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, Gem, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export function ProfileMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!session?.user) return null;

  const username = session.user.username || session.user.id;

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[200] w-48 rounded-xl border border-border bg-card shadow-xl py-1"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <Link
              href={`/u/${username}`}
              role="menuitem"
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4" />내 프로필
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4" />설정
            </Link>
            <Link
              href="/support"
              role="menuitem"
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <Gem className="h-4 w-4" />등급
            </Link>
            <hr className="my-1 border-border" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent text-destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4" />로그아웃
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => {
            if (!v) updatePosition();
            return !v;
          });
        }}
        className="relative z-[60] flex items-center gap-1 rounded-full hover:ring-2 hover:ring-primary/30 p-0.5"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={session.user.image} />
          <AvatarFallback>{(session.user.name || username)[0]}</AvatarFallback>
        </Avatar>
        <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
      </button>
      {menu}
    </>
  );
}
