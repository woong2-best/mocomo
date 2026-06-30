import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedMyContent } from "@/components/used/used-my-content";
import { UsedMySkeleton } from "@/components/used/used-loading-skeletons";
import { ChevronLeft } from "lucide-react";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export default async function UsedMyPage() {
  const user = await getCachedCurrentUser();
  if (!user?.id) redirect("/auth/signin?callbackUrl=/used/my");

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href="/used"
        prefetch
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium"
      >
        <ChevronLeft className="h-4 w-4" />
        중고거래 홈
      </Link>
      <NativePageTitle>
        <h1 className="text-xl font-bold">내 중고거래</h1>
      </NativePageTitle>
      <Suspense fallback={<UsedMySkeleton />}>
        <UsedMyContent userId={user.id} />
      </Suspense>
    </AppPageChrome>
  );
}
