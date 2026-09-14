"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { sanitizeAdLink, isExternalUrl } from "@/lib/safe-link";
import { cn } from "@/lib/utils";

export function SponsorAdClickLink({
  linkUrl,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  linkUrl: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const href = sanitizeAdLink(linkUrl.trim());
  const external = isExternalUrl(href);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(className)}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cn(className)} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
