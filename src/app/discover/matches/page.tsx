import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DiscoveryMatchList } from "@/components/discovery/discovery-match-list";
import { DiscoverMatchesChrome } from "@/components/discovery/discover-matches-chrome";

export default async function DiscoverMatchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/discover/matches");

  return (
    <DiscoverMatchesChrome>
      <DiscoveryMatchList />
    </DiscoverMatchesChrome>
  );
}
