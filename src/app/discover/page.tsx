import { DiscoverySwipeDeck } from "@/components/discovery/discovery-swipe-deck";
import { DiscoverPageHeader } from "@/components/discovery/discover-page-header";

export default function DiscoverPage() {
  return (
    <div className="relative min-h-[calc(100dvh-var(--header-h))] bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--folk-terracotta) / 0.14), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, hsl(var(--folk-gold) / 0.08), transparent 50%)",
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
