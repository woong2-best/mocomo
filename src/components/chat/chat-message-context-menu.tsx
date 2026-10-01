"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function ChatMessageContextMenu({
  open,
  x,
  y,
  label,
  onReply,
  onClose,
}: {
  open: boolean;
  x: number;
  y: number;
  label: string;
  onReply: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (menuRef.current?.contains(target ?? null)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[200] min-w-[9rem] rounded-lg border border-border/70 bg-popover shadow-lg py-1",
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
      style={{ left: x, top: y }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
        onClick={() => {
          onReply();
          onClose();
        }}
      >
        {label}
      </button>
    </div>
  );
}
