import { KOREA_SIGUNGU_BY_SIDO } from "@/lib/korea-regions";

export {
  KOREA_SIDO,
  formatUsedRegion,
  parseUsedRegion,
} from "@/lib/korea-regions";

export function getSigunguList(sidoId: string): string[] {
  return [...(KOREA_SIGUNGU_BY_SIDO[sidoId] ?? [])];
}
