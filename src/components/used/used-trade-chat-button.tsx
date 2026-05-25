"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startUsedTradeChat } from "@/actions/used-market";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UsedTradeChatButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function chat() {
    setLoading(true);
    const res = await startUsedTradeChat(listingId);
    setLoading(false);
    if ("error" in res && res.error) {
      alert(res.error);
      return;
    }
    if ("roomId" in res && res.roomId) router.push(`/messages/${res.roomId}`);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={chat}
      disabled={loading}
      size="lg"
      className="flex-1 h-12 gap-2"
    >
      <MessageCircle className="h-5 w-5" />
      {loading ? "연결 중…" : "채팅하기"}
    </Button>
  );
}
