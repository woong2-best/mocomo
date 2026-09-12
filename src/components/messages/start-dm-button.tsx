"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateDM } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { getTierInfo } from "@/lib/tiers";
import { SupportTierLevel } from "@prisma/client";
import { cn } from "@/lib/utils";

export function StartDmButton({
  userId,
  variant = "default",
}: {
  userId: string;
  variant?: "default" | "profile";
}) {
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

  const profileStyle = variant === "profile";

  return (
    <div>
      <Button
        variant={profileStyle ? "default" : "outline"}
        size={profileStyle ? "default" : "sm"}
        onClick={start}
        disabled={loading}
        aria-label={loading ? "확인 중..." : "메시지"}
        className={cn(
          profileStyle
            ? "rounded-full font-bold shrink-0 h-10 w-10 p-0"
            : "gap-1 rounded-full font-semibold"
        )}
      >
        <MessageSquare className="h-4 w-4" />
        {!profileStyle && (loading ? "확인 중..." : "메시지")}
      </Button>
      {error && <p className="text-xs text-destructive mt-2 max-w-xs">{error}</p>}
    </div>
  );
}
