import { getCachedWeeklyHighlights } from "@/lib/cached-data";
import { WeeklyHighlightsSection } from "@/components/home/weekly-highlights-section";

export async function HomeHighlightsAsync() {
  try {
    const { topLiked, topViewed } = await getCachedWeeklyHighlights();
    if (topLiked.length === 0 && topViewed.length === 0) return null;
    return <WeeklyHighlightsSection topLiked={topLiked} topViewed={topViewed} />;
  } catch {
    return null;
  }
}
