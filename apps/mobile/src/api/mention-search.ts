import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type MentionSearchHit = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export async function searchMentionUsers(q: string) {
  const qs = new URLSearchParams({ q });
  return apiRequest<{ ok: boolean; users: MentionSearchHit[] }>(
    `${MobileApi.mentionSearch}?${qs}`,
    { auth: true }
  );
}
