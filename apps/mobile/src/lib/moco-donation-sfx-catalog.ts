/** Keep in sync with src/lib/moco-donation/sfx-catalog.ts */
export type DonationSfxEntry = {
  id: string;
  label: string;
};

export const DONATION_SFX_CATALOG: readonly DonationSfxEntry[] = [
  { id: "default", label: "도네 효과음" },
] as const;

export const MOCO_DONATION_MIN_SFX = 1;
export const MOCO_DONATION_MAX_AMOUNT = 10_000;
