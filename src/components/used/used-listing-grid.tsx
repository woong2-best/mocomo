"use client";

import type { ComponentProps } from "react";
import { UsedListingCard } from "@/components/used/used-listing-card";

type Listing = ComponentProps<typeof UsedListingCard>["listing"];

export function UsedListingGrid({
  listings,
  viewerUserId = null,
  viewerShowNsfw = false,
}: {
  listings: Listing[];
  viewerUserId?: string | null;
  viewerShowNsfw?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 -mx-4 border-y border-border/60">
      {listings.map((listing) => (
        <UsedListingCard
          key={listing.id}
          listing={listing}
          viewerUserId={viewerUserId}
          viewerShowNsfw={viewerShowNsfw}
        />
      ))}
    </div>
  );
}
