"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, Gem, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const MENU_WIDTH = 192;

function calcMenuPos(anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const left = Math.min(
    Math.max(8, rect.right - MENU_WIDTH),
    window.innerWidth - MENU_WIDTH - 8
  );
  return { top: rect.bottom + 6, left };
}

export function ProfileMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const syncMenuPos = useCallback(() => {
    const btn = menuBtnRef.current;
    if (!btn) return;
    setMenuPos(calcMenuPos(btn));
  }, []);

  const closeMenu = useCallback(() => setOpen(false), []);

  const toggleMenu = useCallback(() => {
    setOpen((prev) => {
      if (prev) return false;
      return true;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    syncMenuPos();
    window.addEventListener("resize", syncMenuPos);
    return () => window.removeEventListener("resize", syncMenuPos);
  }, [open, syncMenuPos]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
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

  const menuPortal =
    open && mounted
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/30"
              aria-hidden
              onClick={closeMenu}
            />
            <div
              ref={menuRef}
              role="menu"
              aria-label="계정 메뉴"
              className="fixed z-[9999] w-48 rounded-xl border-2 border-border bg-background text-foreground shadow-2xl py-1"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <Link
                href={`/u/${username}`}
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent"
                onClick={closeMenu}
              >
                <User className="h-4 w-4 shrink-0" />
                내 프로필
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent"
                onClick={closeMenu}
              >
                <Settings className="h-4 w-4 shrink-0" />
                설정
              </Link>
              <Link
                href="/support"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent"
                onClick={closeMenu}
              >
                <Gem className="h-4 w-4 shrink-0" />
                등급
              </Link>
              <hr className="my-1 border-border" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent text-destructive"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                로그아웃
              </button>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div ref={wrapRef} className="relative z-[2] flex items-center shrink-0">
      <Link
        href={`/u/${username}`}
        className="rounded-full p-0.5 hover:shadow-[0_0_0_2px_hsl(var(--primary)/0.35)]"
        aria-label="내 프로필로 이동"
        onClick={closeMenu}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={session.user.image} />
          <AvatarFallback>{(session.user.name || username)[0]}</AvatarFallback>
        </Avatar>
      </Link>
      <button
        ref={menuBtnRef}
        type="button"
        className="p-1 rounded-md hover:bg-accent/80 cursor-pointer"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="계정 메뉴"
        onClick={(e) => {
          e.stopPropagation();
          toggleMenu();
        }}
      >
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {menuPortal}
    </div>
  );
}
