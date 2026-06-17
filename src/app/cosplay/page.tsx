import { Suspense } from "react";
import {
  getCosplayBoardPosts,
  isCosplayBoardDbReady,
} from "@/actions/cosplay-board";
import { parseCosplayBoardMode } from "@/lib/cosplay-board-data";
import { CosplayBoard } from "@/components/cosplay/cosplay-board";
import { RouteLoading } from "@/components/ui/route-loading";

export const revalidate = 30;

async function CosplayBoardContent({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; page?: string }>;
}) {
  const { mode: modeParam, page: pageParam } = await searchParams;
  const mode = parseCosplayBoardMode(modeParam);
  const page = Math.max(1, Number(pageParam) || 1);

  const [dbReady, data] = await Promise.all([
    isCosplayBoardDbReady(),
    getCosplayBoardPosts({ mode, page }),
  ]);

  return (
    <CosplayBoard
      initialMode={mode}
      posts={data.posts}
      totalCount={data.totalCount}
      currentPage={data.currentPage}
      totalPages={data.totalPages}
      dbReady={dbReady}
    />
  );
}

export default function CosplayPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; page?: string }>;
}) {
  return (
    <div className="max-w-4xl mx-auto p-4 pb-8">
      <Suspense fallback={<RouteLoading />}>
        <CosplayBoardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
