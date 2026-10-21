"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { dataTransferHasFiles, filesFromDataTransfer } from "@/lib/clipboard-files";
import { createTranslator } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const t = createTranslator("en");

let dropNavGuards = 0;

function preventFileNavigation(event: Event) {
  const drag = event as unknown as DragEvent;
  if (!dataTransferHasFiles(drag.dataTransfer)) return;
  event.preventDefault();
}

function retainFileDropNavGuard() {
  dropNavGuards += 1;
  if (dropNavGuards !== 1 || typeof window === "undefined") return;
  window.addEventListener("dragover", preventFileNavigation, true);
  window.addEventListener("drop", preventFileNavigation, true);
}

function releaseFileDropNavGuard() {
  dropNavGuards = Math.max(0, dropNavGuards - 1);
  if (dropNavGuards !== 0 || typeof window === "undefined") return;
  window.removeEventListener("dragover", preventFileNavigation, true);
  window.removeEventListener("drop", preventFileNavigation, true);
}

export type FileDropZoneProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  hint?: string;
};

/**
 * Drop target for OS file drags (Explorer / mobile). Forwards
 * `dataTransfer.files` to the same ingest path as `<input type="file">`.
 */
export const FileDropZone = forwardRef<HTMLDivElement, FileDropZoneProps>(
  function FileDropZone(
    { onFiles, disabled = false, className, children, hint },
    forwardedRef
  ) {
    const [active, setActive] = useState(false);
    const overlayHint = hint?.trim() || t("media.dropHint");

    useEffect(() => {
      retainFileDropNavGuard();
      return () => {
        releaseFileDropNavGuard();
      };
    }, []);

    function assignRef(node: HTMLDivElement | null) {
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }

    function markCopy(event: DragEvent<HTMLDivElement>) {
      if (!dataTransferHasFiles(event.dataTransfer)) return false;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = disabled ? "none" : "copy";
      return true;
    }

    function onDragEnter(event: DragEvent<HTMLDivElement>) {
      if (!markCopy(event)) return;
      if (!disabled) setActive(true);
    }

    function onDragOver(event: DragEvent<HTMLDivElement>) {
      markCopy(event);
    }

    function onDragLeave(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
      event.stopPropagation();
      const next = event.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) return;
      setActive(false);
    }

    function onDrop(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
      event.stopPropagation();
      setActive(false);
      if (disabled) return;
      const files = filesFromDataTransfer(event.dataTransfer);
      if (files.length === 0) return;
      onFiles(files);
    }

    return (
      <div
        ref={assignRef}
        className={cn("file-drop-zone", active && "file-drop-zone--active", className)}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        data-drop-active={active ? "true" : "false"}
      >
        {children}
        {active && !disabled ? (
          <div className="file-drop-zone__overlay" aria-hidden>
            <span className="file-drop-zone__hint">{overlayHint}</span>
          </div>
        ) : null}
      </div>
    );
  }
);

FileDropZone.displayName = "FileDropZone";
