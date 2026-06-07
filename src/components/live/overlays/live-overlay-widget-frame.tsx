"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { LiveOverlayWidget } from "@/lib/live-overlays/types";

type Props = {
  widget: LiveOverlayWidget;
  selected: boolean;
  editable: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<LiveOverlayWidget>) => void;
  onRemove: () => void;
  children: React.ReactNode;
};

/** 돌림판 — 화면에는 원만, 편집은 툴바에서 */
export function LiveOverlayWidgetFrame({
  widget,
  selected,
  editable,
  onSelect,
  onChange,
  onRemove,
  children,
}: Props) {
  const isWheel = widget.type === "wheel";

  if (!widget.visible) return null;

  if (isWheel) {
    return (
      <div
        className="absolute select-none rounded-full"
        style={{
          left: `${widget.x}%`,
          top: `${widget.y}%`,
          width: `${widget.w}%`,
          aspectRatio: "1 / 1",
          height: "auto",
          zIndex: widget.z,
        }}
        onPointerDown={(e) => {
          if (!editable) return;
          e.stopPropagation();
          onSelect();
        }}
      >
        <div className="h-full w-full rounded-full overflow-visible">{children}</div>
      </div>
    );
  }

  return (
    <WheellessFrame
      widget={widget}
      selected={selected}
      editable={editable}
      onSelect={onSelect}
      onChange={onChange}
      onRemove={onRemove}
    >
      {children}
    </WheellessFrame>
  );
}

function WheellessFrame({
  widget,
  selected,
  editable,
  onSelect,
  onChange,
  onRemove,
  children,
}: Props) {
  const dragRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const resizeRef = useRef<{ px: number; py: number; w: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const onDragPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!editable) return;
      e.stopPropagation();
      onSelect();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { px: e.clientX, py: e.clientY, x: widget.x, y: widget.y };
    },
    [editable, onSelect, widget.x, widget.y]
  );

  const onDragPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !containerRef.current?.parentElement) return;
      const parent = containerRef.current.parentElement.getBoundingClientRect();
      const dx = ((e.clientX - dragRef.current.px) / parent.width) * 100;
      const dy = ((e.clientY - dragRef.current.py) / parent.height) * 100;
      onChange({
        x: clamp(dragRef.current.x + dx, 0, 100 - widget.w),
        y: clamp(dragRef.current.y + dy, 0, 100 - widget.h),
      });
    },
    [onChange, widget.h, widget.w]
  );

  const onDragPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!editable) return;
      e.stopPropagation();
      onSelect();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      resizeRef.current = { px: e.clientX, py: e.clientY, w: widget.w, h: widget.h };
    },
    [editable, onSelect, widget.h, widget.w]
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current || !containerRef.current?.parentElement) return;
      const parent = containerRef.current.parentElement.getBoundingClientRect();
      const dw = ((e.clientX - resizeRef.current.px) / parent.width) * 100;
      const dh = ((e.clientY - resizeRef.current.py) / parent.height) * 100;
      onChange({
        w: clamp(resizeRef.current.w + dw, 12, 100 - widget.x),
        h: clamp(resizeRef.current.h + dh, 10, 100 - widget.y),
      });
    },
    [onChange, widget.x, widget.y]
  );

  const onResizePointerUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute select-none",
        selected && editable && "ring-2 ring-orange-400 ring-offset-1 ring-offset-transparent"
      )}
      style={{
        left: `${widget.x}%`,
        top: `${widget.y}%`,
        width: `${widget.w}%`,
        height: `${widget.h}%`,
        zIndex: widget.z,
      }}
      onPointerDown={(e) => {
        if (!editable) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      {editable && selected && (
        <div
          className="absolute -top-7 left-0 right-0 flex items-center justify-between gap-1 rounded-md bg-black/75 px-1 py-0.5 text-white pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex items-center gap-0.5 px-1 text-[10px] cursor-grab active:cursor-grabbing"
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
            onPointerCancel={onDragPointerUp}
          >
            이동
          </button>
          <button
            type="button"
            className="p-0.5 rounded hover:bg-red-600/80 text-[10px] px-1"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            삭제
          </button>
        </div>
      )}
      <div className="h-full w-full overflow-hidden rounded-lg">{children}</div>
      {editable && selected && (
        <div
          className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-tl bg-orange-500/90 pointer-events-auto"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
        />
      )}
    </div>
  );
}
