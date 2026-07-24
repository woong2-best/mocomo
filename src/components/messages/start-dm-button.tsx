"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateDM } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { getTierInfo } from "@/lib/tiers";
import { SupportTierLevel } from "@prisma/client";

export function StartDmButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    setError("");
    const result = await getOrCreateDM(userId);
    setLoading(false);
    if ("error" in result && result.error) {
      const tier = result.requiredTier as SupportTierLevel | undefined;
      setError(
        tier
          ? `${result.error} (필요: ${getTierInfo(tier).labelKo})`
          : result.error
      );
      return;
    }
    if ("room" in result && result.room) router.push(`/messages/${result.room.id}`);
  }

  return (
    <div>
      <Button variant="outline" size="sm" onClick={start} disabled={loading} className="gap-1 rounded-full font-semibold">
        <MessageSquare className="h-4 w-4" />
        {loading ? "확인 중..." : "메시지"}
      </Button>
      {error && <p className="text-xs text-destructive mt-2 max-w-xs">{error}</p>}
    </div>
  );
}
