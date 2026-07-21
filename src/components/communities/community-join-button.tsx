"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { joinCommunity, leaveCommunity } from "@/actions/community-hub";
import { Button } from "@/components/ui/button";

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
  const [member, setMember] = useState(isMember);
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);
  const desiredRef = useRef(isMember);

  useEffect(() => {
    setMember(isMember);
    desiredRef.current = isMember;
  }, [isMember]);

  async function toggle() {
    setError("");
    const next = !desiredRef.current;
    desiredRef.current = next;
    setMember(next);

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      while (true) {
        const target = desiredRef.current;
        const result = target
          ? await joinCommunity(communityId)
          : await leaveCommunity(communityId);
        if (!result) {
          setMember(!target);
          desiredRef.current = !target;
          setError("응답이 없습니다. 로그인 상태를 확인해 주세요.");
          break;
        }
        if ("error" in result && result.error) {
          setMember(!target);
          desiredRef.current = !target;
          setError(result.error);
          break;
        }
        if (desiredRef.current !== target) continue;
        router.refresh();
        break;
      }
    } catch (e) {
      const rollback = !desiredRef.current;
      setMember(rollback);
      desiredRef.current = rollback;
      setError(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      inFlightRef.current = false;
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
        variant={member ? "outline" : "default"}
        className="rounded-xl"
        onClick={() => void toggle()}
        aria-pressed={member}
      >
        {member ? "가입됨 · 탈퇴" : "가입하기"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
