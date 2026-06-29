import { DiscoverySwipeDeck } from "@/components/discovery/discovery-swipe-deck";
import { DiscoverPageHeader } from "@/components/discovery/discover-page-header";

export default function DiscoverPage() {
  return (
    <div className="min-h-[calc(100dvh-var(--header-h))] bg-gradient-to-b from-violet-950/20 via-background to-fuchsia-950/10">
      <DiscoverPageHeader />
      <DiscoverySwipeDeck />
    </div>
  );
}
