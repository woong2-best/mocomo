"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const DUMMY_COVER = "/mocomo-logo.png";
const DUMMY_SUMMARY = "Culture Wiki article preview. Cover and synopsis will appear here.";

export function WikiLinkPreview({
  href,
  title,
  exists,
  children,
}: {
  href: string;
  title: string;
  exists: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline group/wiki">
      <Link
        href={href}
        title={exists ? undefined : `Create "${title}"`}
        className={cn(
          "font-medium hover:underline",
          exists ? "text-primary" : "text-[#c0392b] decoration-[#c0392b]/50"
        )}
      >
        {children}
      </Link>
      <span className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-30 hidden w-64 overflow-hidden rounded-xl border border-border/70 bg-card shadow-xl group-hover/wiki:block">
        <span className="flex gap-2 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DUMMY_COVER} alt="" className="h-16 w-12 shrink-0 rounded-md object-cover bg-muted" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-foreground">{title}</span>
            <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
              {DUMMY_SUMMARY}
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}
