"use client";

import { withFreshLiveStill } from "@/lib/live-preview-thumb";
import { cn } from "@/lib/utils";

/** Frozen live frame — never a playing video, never a profile photo. */
export function LiveStillPoster({
  src,
  className,
}: {
  src?: string | null;
  className?: string;
}) {
  const url = withFreshLiveStill(src);
  if (!url) {
    return <div className={cn("absolute inset-0 bg-[#141418]", className)} aria-hidden />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={cn("absolute inset-0 h-full w-full object-cover", className)} />
  );
}
