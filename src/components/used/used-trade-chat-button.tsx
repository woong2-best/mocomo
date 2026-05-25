"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startUsedTradeChat } from "@/actions/used-market";
import { MessageCircle } from "lucide-react";

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
    <button
      type="button"
      onClick={chat}
      disabled={loading}
      className="flex-1 h-12 rounded-xl bg-[#FF6F0F] hover:bg-[#E6630C] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
    >
      <MessageCircle className="h-5 w-5" />
      {loading ? "연결 중…" : "채팅하기"}
    </button>
  );
}
