/** 서버·클라이언트 공통 업로드 용량 (bytes) */
export function getUploadMaxBytes(
  premiumTier: string | undefined | null,
  category: "image" | "video" | "audio"
): number {
  const premium = premiumTier === "PREMIUM";
  if (category === "video") {
    return premium ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
  }
  return premium ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
}

export function formatUploadMaxLabel(
  premiumTier: string | undefined | null,
  category: "image" | "video" | "audio"
): string {
  const mb = Math.round(getUploadMaxBytes(premiumTier, category) / 1024 / 1024);
  return `${mb}MB`;
}

export function uploadSizeExceededMessage(
  premiumTier: string | undefined | null,
  category: "image" | "video" | "audio"
): string {
  const max = formatUploadMaxLabel(premiumTier, category);
  if (category === "video") {
    return `영상 용량이 ${max} 제한을 초과했습니다. 짧게 자르거나 해상도를 낮춰 주세요. (프리미엄: 최대 100MB)`;
  }
  return `파일 용량이 ${max} 제한을 초과했습니다.`;
}

/** Vercel 서버리스 본문 한도 — 이보다 크면 직접 Storage 업로드 */
export const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024;
