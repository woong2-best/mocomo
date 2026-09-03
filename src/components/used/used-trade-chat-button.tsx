"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startUsedTradeChat } from "@/actions/used-market";
import { usedMarketVerifyPath } from "@/lib/used-market-verify-path";
import { Button } from "@/components/ui/button";

function needsVerification(error: string) {
  return (
    error.includes("인증") ||
    error.includes("verification") ||
    error.includes("입금 계좌") ||
    error.includes("휴대폰")
  );
}

export function UsedTradeChatButton({
  listingId,
  countryCode = "KR",
}: {
  listingId: string;
  countryCode?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function chat() {
    setError("");
    setLoading(true);
    const res = await startUsedTradeChat(listingId);
    setLoading(false);
    if ("error" in res && res.error) {
      if (needsVerification(res.error)) {
        router.push(usedMarketVerifyPath(`/used/${listingId}`, countryCode));
        return;
      }
      setError(res.error);
      return;
    }
    if ("roomId" in res && res.roomId) router.push(`/messages/${res.roomId}`);
  }

  return (
    <div className="flex-1 space-y-1">
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
      <Button
        type="button"
        variant="secondary"
        onClick={() => void chat()}
        disabled={loading}
        size="lg"
        className="w-full h-12 gap-2"
      >
        <MessageSquare className="h-5 w-5" />
        {loading ? "연결 중…" : "채팅하기"}
      </Button>
    </div>
  );
}
