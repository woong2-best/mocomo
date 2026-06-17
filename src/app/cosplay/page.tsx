import { Suspense } from "react";
import { parseCosplayBoardMode } from "@/lib/cosplay-board-data";
import { CosplayBoard } from "@/components/cosplay/cosplay-board";
import { RouteLoading } from "@/components/ui/route-loading";

export default async function CosplayPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: modeParam } = await searchParams;
  const initialMode = parseCosplayBoardMode(modeParam);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-8">
      <Suspense fallback={<RouteLoading />}>
        <CosplayBoard initialMode={initialMode} />
      </Suspense>
    </div>
  );
}
