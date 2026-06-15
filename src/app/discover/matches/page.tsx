import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DiscoveryMatchList } from "@/components/discovery/discovery-match-list";
import { Sparkles } from "lucide-react";

export default async function DiscoverMatchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/discover/matches");

  return (
    <div className="min-h-[calc(100dvh-var(--header-h))] pb-nav lg:pb-4">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Link href="/discover" className="text-sm text-primary hover:underline">
            ← 매칭
          </Link>
          <h1 className="font-display font-bold text-lg flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-500" />
            연결됨
          </h1>
        </div>
      </header>
      <DiscoveryMatchList />
    </div>
  );
}
