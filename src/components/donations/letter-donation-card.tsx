"use client";

import { useEffect, useState } from "react";
import { LetterDonationEnvelope } from "@/components/donations/letter-donation-envelope";

type TipPayload = {
  id: string;
  amount: number;
  message: string;
  senderName: string;
};

export function LetterDonationCard({
  tipId,
  interactive = true,
}: {
  tipId: string;
  interactive?: boolean;
}) {
  const [tip, setTip] = useState<TipPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/tips/${tipId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "편지를 불러오지 못했습니다.");
        }
        return res.json() as Promise<{ tip: TipPayload }>;
      })
      .then((data) => {
        if (!cancelled) setTip(data.tip);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "오류");
      });
    return () => {
      cancelled = true;
    };
  }, [tipId]);

  if (error) {
    return <p className="text-sm text-muted-foreground py-2">{error}</p>;
  }
  if (!tip) {
    return <p className="text-sm text-muted-foreground py-2 animate-pulse">편지 불러오는 중…</p>;
  }

  return (
    <LetterDonationEnvelope
      tipId={tip.id}
      amount={tip.amount}
      message={tip.message}
      senderName={tip.senderName}
      interactive={interactive}
    />
  );
}
