"use client";

import type { ComponentProps } from "react";
import { UsedListingCard } from "@/components/used/used-listing-card";
import { MotionInView } from "@/components/motion/motion-primitives";

type Listing = ComponentProps<typeof UsedListingCard>["listing"];

export function UsedListingGrid({ listings }: { listings: Listing[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 pb-8">
      {listings.map((listing, i) => (
        <MotionInView key={listing.id} delay={Math.min(i * 0.04, 0.45)}>
          <UsedListingCard listing={listing} />
        </MotionInView>
      ))}
    </div>
  );
}
