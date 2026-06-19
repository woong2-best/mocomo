"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  disabled?: boolean;
  onMove: (x: number, z: number) => void;
  onInteract?: () => void;
  canInteract?: boolean;
  interactLabel?: string;
};

export function HomeAvatarControls({ disabled, onMove, onInteract, canInteract, interactLabel }: Props) {
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-xl border-2 border-folk-cobalt/25 bg-white/95 text-folk-cobalt shadow-folk-sm active:scale-95 transition-transform disabled:opacity-40";

  return (
    <div className="pointer-events-auto flex flex-col gap-2">
      {canInteract && onInteract && (
        <button
          type="button"
          onClick={onInteract}
          className="rounded-xl border-2 border-folk-terracotta bg-folk-terracotta px-4 py-2 text-xs font-bold text-white shadow-folk animate-pulse"
        >
          {interactLabel ?? "상호작용 (E)"}
        </button>
      )}

      <div className="grid grid-cols-3 gap-1 w-[8.5rem]">
        <span />
        <DirBtn
          className={btn}
          disabled={disabled}
          onDown={() => onMove(0, -1)}
          onUp={() => onMove(0, 0)}
        >
          <ChevronUp className="h-5 w-5" />
        </DirBtn>
        <span />
        <DirBtn
          className={btn}
          disabled={disabled}
          onDown={() => onMove(-1, 0)}
          onUp={() => onMove(0, 0)}
        >
          <ChevronLeft className="h-5 w-5" />
        </DirBtn>
        <span className="flex items-center justify-center text-[9px] font-bold text-muted-foreground">이동</span>
        <DirBtn
          className={btn}
          disabled={disabled}
          onDown={() => onMove(1, 0)}
          onUp={() => onMove(0, 0)}
        >
          <ChevronRight className="h-5 w-5" />
        </DirBtn>
        <span />
        <DirBtn
          className={btn}
          disabled={disabled}
          onDown={() => onMove(0, 1)}
          onUp={() => onMove(0, 0)}
        >
          <ChevronDown className="h-5 w-5" />
        </DirBtn>
        <span />
      </div>
    </div>
  );
}

function DirBtn({
  children,
  className,
  disabled,
  onDown,
  onUp,
}: {
  children: React.ReactNode;
  className: string;
  disabled?: boolean;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(className)}
      onPointerDown={(e) => {
        e.preventDefault();
        onDown();
      }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
    >
      {children}
    </button>
  );
}
