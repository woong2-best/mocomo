import { DiscoverySwipeDeck } from "@/components/discovery/discovery-swipe-deck";
import { DiscoverPageHeader } from "@/components/discovery/discover-page-header";

export default function DiscoverPage() {
  return (
    <div className="relative min-h-[calc(100dvh-var(--header-h))] bg-[#0c0c0c] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(244,63,94,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(249,115,22,0.1), transparent 50%)",
        }}
        aria-hidden
      />
      <div className="relative">
        <DiscoverPageHeader />
        <DiscoverySwipeDeck />
      </div>
    </div>
  );
}
