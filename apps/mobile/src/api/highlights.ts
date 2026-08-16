import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type HighlightItem = {
  id: string;
  title: string | null;
  content: string;
  viewCount: number;
  weeklyLikes: number;
  commentCount: number;
  hasMedia: boolean;
  author: { username: string; name: string | null };
};

export async function fetchWeeklyHighlights() {
  return apiRequest<{ topLiked: HighlightItem[]; topViewed: HighlightItem[] }>(
    MobileApi.highlights,
    { auth: true }
  );
}
