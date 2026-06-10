import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listMyCreatorSeries } from "@/actions/creator-works";
import { WebtoonStudioForm } from "@/components/webtoon/webtoon-studio-form";

export const dynamic = "force-dynamic";

export default async function WebtoonStudioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/webtoon/studio");

  const all = await listMyCreatorSeries().catch(() => []);
  const myWebtoons = all.filter((s) => s.kind === "WEBTOON");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        월~일 연재 요일을 직접 설정하고 회차별 가격으로 판매하세요. 등록된 웹툰은{" "}
        <strong className="text-foreground font-medium">요일별 전체 웹툰</strong> 그리드에 표시됩니다.
      </p>
      <WebtoonStudioForm myWebtoons={myWebtoons} />
    </div>
  );
}
