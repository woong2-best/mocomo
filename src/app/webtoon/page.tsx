import { listWebtoonWeeklyGrid } from "@/actions/webtoon";
import { WebtoonWeeklyGrid } from "@/components/webtoon/webtoon-weekly-grid";

export const dynamic = "force-dynamic";

export default async function WebtoonHomePage() {
  const byDay = await listWebtoonWeeklyGrid().catch(() => ({
    MON: [],
    TUE: [],
    WED: [],
    THU: [],
    FRI: [],
    SAT: [],
    SUN: [],
  }));

  return <WebtoonWeeklyGrid byDay={byDay} />;
}
