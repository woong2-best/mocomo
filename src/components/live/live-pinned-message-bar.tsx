"use client";

import { ChevronDown, Pin } from "lucide-react";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { cn } from "@/lib/utils";

type Props = {
  /** StreamerProfile.announcement — links, hashtags, mentions supported */
  message: string | null | undefined;
  className?: string;
};

function previewLine(text: string, max = 100): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}

/** Collapsible pinned streamer notice above live chat (external viewer). */
export function LivePinnedMessageBar({ message, className }: Props) {
  const trimmed = message?.trim();
  if (!trimmed) return null;

  return (
    <details
      className={cn(
        "group rounded-lg border border-border/60 bg-muted/40 text-foreground",
        className
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs [&::-webkit-details-marker]:hidden">
        <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-muted-foreground group-open:hidden">
          {previewLine(trimmed)}
        </span>
        <span className="hidden min-w-0 flex-1 truncate font-medium text-foreground group-open:inline">
          고정 메시지
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/60 px-3 py-2.5">
        <LinkifiedText
          text={trimmed}
          as="p"
          className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground"
        />
      </div>
    </details>
  );
}
