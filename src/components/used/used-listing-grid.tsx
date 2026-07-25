"use client";

import type { ComponentProps } from "react";
import { UsedListingCard } from "@/components/used/used-listing-card";
import { MotionInViewIndexed } from "@/components/motion/motion-primitives";

type Listing = ComponentProps<typeof UsedListingCard>["listing"];

/** 가로 최대 4열 · 칸 간격 없이 밀집 */
export function UsedListingGrid({ listings }: { listings: Listing[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 -mx-4 border-y border-border/60 bg-border/40">
      {listings.map((listing, i) => (
        <MotionInViewIndexed key={listing.id} index={i} className="h-full min-w-0">
          <UsedListingCard listing={listing} dense />
        </MotionInViewIndexed>
      ))}
    </div>
  );
}
