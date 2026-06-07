"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, Gem, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const MENU_WIDTH = 192;

export function ProfileMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8
    );
    setMenuPos({
      top: rect.bottom + 8,
      left,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
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
    open && mounted && menuPos
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-transparent"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[9999] w-48 rounded-xl border border-border bg-background shadow-2xl py-1 pointer-events-auto"
              style={{ top: menuPos.top, left: menuPos.left }}
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
            </div>
          </>,
          document.body
        )
      : null;

  const openMenu = useCallback(() => {
    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, rect.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - 8
      );
      setMenuPos({ top: rect.bottom + 8, left });
    }
    setOpen(true);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (open) {
            setOpen(false);
            setMenuPos(null);
            return;
          }
          openMenu();
        }}
        className="relative z-[2] flex items-center gap-1 rounded-full p-0.5 cursor-pointer hover:shadow-[0_0_0_2px_hsl(var(--primary)/0.35)]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={session.user.image} />
          <AvatarFallback>{(session.user.name || username)[0]}</AvatarFallback>
        </Avatar>
        <ChevronDown
          className={`h-3 w-3 text-muted-foreground hidden sm:block transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {menu}
    </>
  );
}
