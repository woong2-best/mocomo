import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type FortuneCookieDto = {
  id: string;
  serial: string;
  serialNo: number;
  nickname: string;
  fortuneText: string;
  theme: string;
  mocoQuantity: number;
  openedAt: string;
  createdAt: string;
};

export async function fetchFortuneCookies(cursor?: string) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiRequest<{ cookies: FortuneCookieDto[]; nextCursor: string | null }>(
    `${MobileApi.fortuneCookies}${qs}`,
    { auth: true }
  );
}
