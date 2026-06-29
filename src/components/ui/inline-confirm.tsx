"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InlineConfirm({
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "destructive",
  size = "sm",
  disabled,
  pending,
  onConfirm,
  renderTrigger,
  className,
}: {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default" | "outline";
  size?: "sm" | "default";
  disabled?: boolean;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
  renderTrigger: (requestConfirm: () => void) => React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className={cn("inline-flex", className)}>
        {renderTrigger(() => {
          if (!disabled && !pending) setOpen(true);
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1.5",
        className
      )}
    >
      <p className="text-xs text-destructive">{message}</p>
      <Button
        type="button"
        variant={variant}
        size={size}
        className="h-7 text-xs"
        disabled={disabled || pending}
        onClick={() => {
          void onConfirm();
          setOpen(false);
        }}
      >
        {pending ? "처리 중…" : confirmLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        size={size}
        className="h-7 text-xs"
        disabled={pending}
        onClick={() => setOpen(false)}
      >
        {cancelLabel}
      </Button>
    </div>
  );
}
