/** 도네 SFX — 파일은 public/sfx/donation/{id}.mp3 (추후 업로드) */
export type DonationSfxEntry = {
  id: string;
  label: string;
  /** public 경로 — /sfx/donation/coin.mp3 */
  src: string;
};

/** 스트리머/운영자가 파일 추가 후 목록만 갱신 */
export const DONATION_SFX_CATALOG: readonly DonationSfxEntry[] = [
  { id: "default", label: "도네 효과음", src: "/sfx/donation/default.mp3" },
] as const;

export function resolveDonationSfx(sfxKey: string | null | undefined): DonationSfxEntry {
  const key = sfxKey?.trim();
  const found = DONATION_SFX_CATALOG.find((e) => e.id === key);
  return found ?? DONATION_SFX_CATALOG[0]!;
}

export function isValidDonationSfxKey(key: string): boolean {
  return DONATION_SFX_CATALOG.some((e) => e.id === key);
}
