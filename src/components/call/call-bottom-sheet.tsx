"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function CallBottomSheet({ open, onClose, title, children, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="닫기"
      />
      <div
        className={cn(
          "relative max-h-[85vh] overflow-y-auto rounded-t-[1.75rem] bg-neutral-900 text-white shadow-2xl",
          "animate-in slide-in-from-bottom duration-200 pb-safe",
          className
        )}
        role="dialog"
        aria-modal
        aria-label={title}
      >
        <div className="sticky top-0 z-10 bg-neutral-900 pt-3 pb-2">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
          <h2 className="text-center text-[15px] font-semibold">{title}</h2>
        </div>
        <div className="px-4 pb-6">{children}</div>
      </div>
    </div>
  );
}
