"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Bookmark, Copy, EyeOff, Flag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReelItem } from "@/lib/reels/types";

export type ReelsMenuAction =
  | "not-interested"
  | "report"
  | "copy-link"
  | "save"
  | "author";

type Props = {
  open: boolean;
  reel: ReelItem;
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: ReelsMenuAction) => void;
};

const ITEMS: {
  id: ReelsMenuAction;
  label: string;
  icon: typeof Flag;
  href?: boolean;
}[] = [
  { id: "not-interested", label: "관심 없음", icon: EyeOff },
  { id: "report", label: "신고", icon: Flag },
  { id: "copy-link", label: "링크 복사", icon: Copy },
  { id: "save", label: "저장", icon: Bookmark },
  { id: "author", label: "작성자 보기", icon: User, href: true },
];

export function ReelsContextMenu({ open, reel, x, y, onClose, onAction }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointer(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("button, a");
    first?.focus();
  }, [open]);

  if (!open) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(Math.max(8, x), vw - 220);
  const top = Math.min(Math.max(8, y), vh - 280);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="영상 메뉴"
      className="fixed z-[80] w-52 overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/95 py-1 text-white shadow-2xl backdrop-blur-md"
      style={{ left, top }}
    >
      {ITEMS.map(({ id, label, icon: Icon, href }) => {
        const className = cn(
          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
        );
        if (href) {
          return (
            <Link
              key={id}
              role="menuitem"
              href={`/u/${reel.author.username}`}
              className={className}
              onClick={onClose}
            >
              <Icon className="h-4 w-4 opacity-80" aria-hidden />
              {label}
            </Link>
          );
        }
        return (
          <button
            key={id}
            type="button"
            role="menuitem"
            className={className}
            onClick={() => {
              onAction(id);
              onClose();
            }}
          >
            <Icon className="h-4 w-4 opacity-80" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
