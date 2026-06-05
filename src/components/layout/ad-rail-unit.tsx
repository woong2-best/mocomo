"use client";

import Link from "next/link";
import { sanitizeAdLink, isExternalUrl } from "@/lib/safe-link";
import type { RailAdData } from "@/lib/default-ads";

export function AdRailUnit({ ad }: { ad: RailAdData }) {
  const href = sanitizeAdLink(ad.linkUrl);
  const external = isExternalUrl(href);

  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer sponsored" } : {})}
      className="group block overflow-hidden rounded-xl border border-border/50 bg-card/80 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
      aria-label={`광고: ${ad.title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ad.imageUrl}
        alt=""
        className="w-full aspect-[3/4] object-cover bg-muted"
        loading="lazy"
      />
      <div className="px-2 py-2 border-t border-border/40">
        {ad.sponsorName && (
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
            {ad.sponsorName}
          </p>
        )}
        <p className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-primary">
          {ad.title}
        </p>
        {ad.ctaLabel && (
          <p className="text-[10px] text-primary mt-0.5">{ad.ctaLabel} →</p>
        )}
      </div>
    </Link>
  );
}
