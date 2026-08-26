"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";

type Props = {
  tags: string[];
  className?: string;
};

/** Collapsible hashtag row for live chat sidebar (external viewer v2). */
export function LiveRoomTagsBar({ tags, className }: Props) {
  const cleaned = tags.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;

  return (
    <details
      className={`group rounded-lg border border-white/10 bg-[#0f1219] text-white ${className ?? ""}`}
      open={cleaned.length <= 4}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs text-white/80 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate">
          {cleaned.slice(0, 6).map((tag) => (
            <span key={tag} className="mr-2 last:mr-0">
              #{tag.replace(/^#/, "")}
            </span>
          ))}
          {cleaned.length > 6 ? ` +${cleaned.length - 6}` : ""}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/50 transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-3 py-2">
        {cleaned.map((tag) => {
          const label = tag.replace(/^#/, "");
          return (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent("#" + label)}`}
              className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/90 hover:bg-white/15"
            >
              #{label}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
