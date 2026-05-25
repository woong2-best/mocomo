import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UsedPostForm } from "@/components/used/used-post-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function UsedNewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/used/new");

  const sns = (session.user as { profile?: { snsLinks?: unknown } }).profile?.snsLinks as
    | { location?: string }
    | undefined;

  return (
    <div className="py-4 max-w-lg mx-auto">
      <Link href="/used" className="inline-flex items-center gap-1 text-sm text-[#FF6F0F] font-medium mb-4">
        <ChevronLeft className="h-4 w-4" />
        중고거래 홈
      </Link>
      <h1 className="text-xl font-bold mb-1">내 물건 팔기</h1>
      <p className="text-sm text-muted-foreground mb-6">당근마켓처럼 사진·가격·동네를 적고 올려 보세요.</p>
      <UsedPostForm defaultRegion={sns?.location} />
    </div>
  );
}
