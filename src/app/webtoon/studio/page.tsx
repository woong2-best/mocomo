import { redirect } from "next/navigation";
import Link from "next/link";
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
      <div className="flex flex-wrap gap-2">
        <Link
          href="/webtoon/studio/draw"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0096fa] text-white px-4 py-2 text-sm font-semibold hover:bg-[#0086e0]"
        >
          그리기 스튜디오 열기
        </Link>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        그린 그림을 <strong className="text-foreground font-medium">작품 단위</strong>로 올리고 가격을 정해
        판매하세요. 등록된 작품은{" "}
        <Link href="/webtoon" className="text-[#0096fa] font-medium hover:underline">
          일러스트 마켓
        </Link>
        에 노출됩니다. 수익의 90%가 지갑에 적립됩니다.
      </p>
      <WebtoonStudioForm myWebtoons={myWebtoons} />
    </div>
  );
}
