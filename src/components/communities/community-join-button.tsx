"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
          setError(t("communities.s1irxqz9"));
          break;
        }
        if ("error" in result && result.error) {
          setMember(!target);
          desiredRef.current = !target;
          setError(errorText(result.error));
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
      setError(e instanceof Error ? e.message : t("lib.post.engage.client.s951a3d5ff5"));
    } finally {
      inFlightRef.current = false;
    }
  }

  if (isOwner) {
    return (
      <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted">
        {t("communities.sq5h54")}
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
        {member ? t("communities.scdap6a") : t("communities.smj8tgd")}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
