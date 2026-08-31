"use client";

import { PaidVideoCopyrightWarning } from "@/components/media/paid-video-copyright-warning";

/** Synthetic first slide for unlocked paid photo sets. */
export function PaidContentProtectionSlide({ className }: { className?: string }) {
  return <PaidVideoCopyrightWarning variant="slide" className={className} />;
}
