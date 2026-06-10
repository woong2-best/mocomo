import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listMyCreatorSeries } from "@/actions/creator-works";
import { CreatorStudioForm } from "@/components/works/creator-studio-form";

export const dynamic = "force-dynamic";

export default async function WorksStudioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/works/studio");

  const mySeries = await listMyCreatorSeries().catch(() => []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        웹툰·사진·영상 시리즈를 만들고 회차별로 가격을 설정해 판매하세요. 판매 수익의 90%가 지갑에 적립됩니다.
      </p>
      <CreatorStudioForm mySeries={mySeries} />
    </div>
  );
}
