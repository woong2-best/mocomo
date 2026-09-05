import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedWtbMySection } from "@/components/used/used-wtb-my-section";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export default async function UsedWtbPage() {
  const user = await getCachedCurrentUser();
  if (!user?.id) redirect("/auth/signin?callbackUrl=/used/wtb");

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href="/used/my"
        prefetch
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium"
      >
        <ChevronLeft className="h-4 w-4" />
        내 중고거래
      </Link>
      <NativePageTitle>
        <h1 className="text-xl font-bold">WTB 알림</h1>
        <p className="text-sm text-muted-foreground mt-1">
          조건에 맞는 새 글이 올라오면 알림을 보내 드려요.
        </p>
      </NativePageTitle>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <UsedWtbMySection />
      </Suspense>
    </AppPageChrome>
  );
}
