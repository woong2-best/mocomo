"use client";

import Image from "next/image";
import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string | null;
  value: string;
  onChange: (value: string) => void;
  canEdit: boolean;
  onSave: () => void;
  saving?: boolean;
  cancelLabel: string;
  saveLabel: string;
  savingLabel: string;
  readOnlyHint?: string;
  placeholder?: string;
  /** Soft dim only — no card chrome behind the sticky */
  dimOverlay?: boolean;
};

/** Floating sticky-note only (no modal card). X sits on the note top-right. */
export function StickyMemoDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  value,
  onChange,
  canEdit,
  onSave,
  saving,
  cancelLabel,
  saveLabel,
  savingLabel,
  readOnlyHint,
  placeholder,
  dimOverlay = true,
}: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            dimOverlay ? "bg-black/45" : "bg-transparent"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(92vw,20rem)] -translate-x-1/2 -translate-y-1/2",
            "border-0 bg-transparent p-0 shadow-none outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          onOpenAutoFocus={(e) => {
            // Keep focus on textarea when editable
            if (!canEdit) e.preventDefault();
          }}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {subtitle ?? "calendar memo"}
          </DialogPrimitive.Description>

          <div className="relative mx-auto aspect-square w-full">
            <Image
              src="/images/calendar/sticky-memo.png"
              alt=""
              fill
              priority
              className="pointer-events-none select-none object-contain drop-shadow-2xl"
              sizes="320px"
            />

            <DialogPrimitive.Close
              type="button"
              className="absolute right-[8%] top-[8%] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#3d3214]/85 text-white shadow-md hover:bg-[#3d3214]"
              aria-label="닫기"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </DialogPrimitive.Close>

            <div className="absolute inset-[14%] top-[22%] bottom-[12%] flex flex-col">
              <p className="mb-1 shrink-0 pr-6 text-center font-serif text-sm font-bold text-[#5c4a1a]/90">
                {title}
              </p>
              {subtitle ? (
                <p className="mb-1 shrink-0 text-center text-[10px] text-[#6b5a28]/80">
                  {subtitle}
                </p>
              ) : null}

              {canEdit ? (
                <textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  maxLength={2000}
                  rows={8}
                  className={cn(
                    "min-h-0 w-full flex-1 resize-none border-0 bg-transparent p-1",
                    "text-sm leading-relaxed text-[#3d3214]",
                    "placeholder:text-[#8a7a45]/70 focus:outline-none focus:ring-0",
                    "whitespace-pre-wrap break-words"
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-y-auto p-1 text-sm leading-relaxed",
                    "whitespace-pre-wrap break-words text-[#3d3214]"
                  )}
                >
                  {value.trim() ? value : (readOnlyHint ?? "")}
                </div>
              )}

              {canEdit ? (
                <div className="mt-2 flex shrink-0 justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="rounded-md px-2.5 py-1 text-xs font-semibold text-[#5c4a1a]/80 hover:bg-black/5"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={onSave}
                    className="rounded-md bg-[#c45c26] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#a84c1f] disabled:opacity-60"
                  >
                    {saving ? savingLabel : saveLabel}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
