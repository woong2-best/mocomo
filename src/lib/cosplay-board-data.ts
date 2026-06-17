import type { CosplayBoardMode as PrismaMode } from "@prisma/client";

export type CosplayBoardMode = "rental" | "purchase";

export const COSPLAY_BOARD_PAGE_SIZE = 15;

export type CosplayBoardListItem = {
  id: string;
  mode: CosplayBoardMode;
  title: string;
  author: string;
  authorUsername: string;
  createdAt: Date;
  viewCount: number;
  commentCount: number;
  priceLabel: string;
  isNotice: boolean;
};

export function parseCosplayBoardMode(value: string | undefined): CosplayBoardMode {
  return value === "purchase" ? "purchase" : "rental";
}

export function toUiMode(mode: PrismaMode): CosplayBoardMode {
  return mode === "PURCHASE" ? "purchase" : "rental";
}

export function formatCosplayBoardDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m}.${d}`;
}

export function formatCosplayBoardPriceLabel(
  mode: CosplayBoardMode,
  price: number | null | undefined
): string {
  if (price == null || price <= 0) return "협의";
  const formatted = price.toLocaleString("ko-KR");
  return mode === "rental" ? `1일 ${formatted}원` : `${formatted}원`;
}

export function cosplayBoardListHref(mode: CosplayBoardMode, page?: number) {
  const params = new URLSearchParams();
  if (mode === "purchase") params.set("mode", "purchase");
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/cosplay?${qs}` : "/cosplay";
}
