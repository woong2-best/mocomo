import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PenSquare } from "lucide-react";
import { getCachedSession } from "@/lib/auth";
import { parseCosplayBoardMode } from "@/lib/cosplay-board-data";
import { CosplayBoardPostForm } from "@/components/cosplay/cosplay-board-post-form";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { Button } from "@/components/ui/button";

export default async function CosplayBoardNewPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await getCachedSession();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/cosplay/board/new");
  }

  const { mode: modeParam } = await searchParams;
  const mode = parseCosplayBoardMode(modeParam);

  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" asChild>
          <Link href={mode === "purchase" ? "/cosplay?mode=purchase" : "/cosplay"}>
            <ArrowLeft className="h-4 w-4" />
            목록
          </Link>
        </Button>
        <NativePageTitle>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <PenSquare className="h-4 w-4 text-pink-500" />
            글쓰기
          </h1>
        </NativePageTitle>
        <div className="w-16" />
      </div>

      <CosplayBoardPostForm defaultMode={mode} />
    </AppPageChrome>
  );
}
