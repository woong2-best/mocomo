import { LiveScheduleBoard } from "@/components/live/live-schedule-board";
import { getLiveScheduleBoard } from "@/lib/live-schedule-data";
import { getAuthUserId } from "@/lib/auth";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { LiveFeatureDisabledNotice } from "@/components/live/live-feature-disabled";

export const revalidate = 60;

export default async function LiveSchedulePage() {
  if (!isLiveFeatureEnabled()) {
    return <LiveFeatureDisabledNotice />;
  }

  const currentUserId = await getAuthUserId();
  let board = { entries: [], broadcasts: [] } as Awaited<ReturnType<typeof getLiveScheduleBoard>>;

  try {
    board = await getLiveScheduleBoard();
  } catch {
    /* DB 미마이그레이션 */
  }

  return (
    <LiveScheduleBoard
      entries={board.entries}
      broadcasts={board.broadcasts}
      isStreamer={Boolean(currentUserId)}
    />
  );
}
