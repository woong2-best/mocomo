"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinCommunity, leaveCommunity } from "@/actions/community-hub";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function CommunityJoinButton({
  communityId,
  isMember,
  isOwner,
}: {
  communityId: string;
  isMember: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setError("");
    setLoading(true);
    try {
      const result = isMember
        ? await leaveCommunity(communityId)
        : await joinCommunity(communityId);
      if (!result) {
        setError("응답이 없습니다. 로그인 상태를 확인해 주세요.");
        return;
      }
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (isOwner) {
    return (
      <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted">
        개설자
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        variant={isMember ? "outline" : "default"}
        className="rounded-xl"
        disabled={loading}
        onClick={() => void toggle()}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isMember ? (
          "가입됨 · 탈퇴"
        ) : (
          "가입하기"
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
