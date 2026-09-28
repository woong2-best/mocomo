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
    <div className="divide-y divide-border/80">
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
