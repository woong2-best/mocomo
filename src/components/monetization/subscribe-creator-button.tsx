"use client";

/** Creator recurring support is disabled — no subscribe UI. */
export function SubscribeCreatorButton(_props: {
  creatorId: string;
  username: string;
  priceKrw: number;
  paymentsEnabled: boolean;
  subscribed?: boolean;
  compact?: boolean;
}) {
  return null;
}

export function SubscribeCreatorHint(_props: { priceKrw: number }) {
  return null;
}
