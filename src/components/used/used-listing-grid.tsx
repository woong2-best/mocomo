"use client";

import type { ComponentProps } from "react";
import { UsedListingCard } from "@/components/used/used-listing-card";
import { MotionInViewIndexed } from "@/components/motion/motion-primitives";

type Listing = ComponentProps<typeof UsedListingCard>["listing"];

export function UsedListingGrid({ listings }: { listings: Listing[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 pb-8">
      {listings.map((listing, i) => (
        <MotionInViewIndexed key={listing.id} index={i}>
          <UsedListingCard listing={listing} />
        </MotionInViewIndexed>
      ))}
    </div>
  );
}
