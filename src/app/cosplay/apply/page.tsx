import { redirect } from "next/navigation";
import Link from "next/link";
import { getCosplayerApplyContext } from "@/actions/cosplayer";
import { CosplayerApplyForm } from "@/components/cosplay/cosplayer-apply-form";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

export default async function CosplayerApplyPage() {
  let ctx: Awaited<ReturnType<typeof getCosplayerApplyContext>>;
  try {
    ctx = await getCosplayerApplyContext();
  } catch {
    redirect("/auth/signin?callbackUrl=/cosplay/apply");
  }

  if (ctx.alreadyRegistered && ctx.profile) {
    return (
      <AppPageChrome spacing="sm">
        <Link href="/cosplay">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            코스어 목록
          </Button>
        </Link>
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-4 text-center">
            <p className="font-semibold">이미 코스어로 등록되어 있습니다.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href={`/cosplay/${ctx.username}`}>
                <Button>내 코스어 페이지</Button>
              </Link>
              <Link href="/cosplay">
                <Button variant="outline">코스어 목록</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </AppPageChrome>
    );
  }

  return (
    <AppPageChrome spacing="sm">
      <Link href="/cosplay">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          코스어 목록
        </Button>
      </Link>
      <CosplayerApplyForm animes={ctx.animes} username={ctx.username} />
    </AppPageChrome>
  );
}
