"use client";

import { useState } from "react";
import type { CommunityJoinMode } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { updateCommunityJoinMode, createCommunityInvite } from "@/actions/community-join";

const JOIN_MODE_OPTIONS: { value: CommunityJoinMode; label: string; description: string }[] = [
  { value: "OPEN", label: "누구나 즉시 가입", description: "로그인한 사용자는 버튼 한 번으로 가입할 수 있습니다." },
  { value: "APPROVE", label: "가입 승인 필요", description: "방장·관리자가 요청을 승인해야 합니다." },
  { value: "INVITE_ONLY", label: "초대 링크 전용", description: "초대 링크가 있는 사용자만 가입할 수 있습니다." },
];

export function CommunityJoinModeSettings({
  communityId,
  initialJoinMode,
}: {
  communityId: string;
  initialJoinMode: CommunityJoinMode;
}) {
  const [joinMode, setJoinMode] = useState(initialJoinMode);
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  async function saveMode(mode: CommunityJoinMode) {
    setError("");
    setLoading(true);
    try {
      const result = await updateCommunityJoinMode(communityId, mode);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setJoinMode(mode);
    } finally {
      setLoading(false);
    }
  }

  async function generateInvite() {
    setError("");
    setInviteLoading(true);
    try {
      const result = await createCommunityInvite(communityId);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("code" in result) {
        const url = `${window.location.origin}${window.location.pathname}?invite=${result.code}`;
        setInviteLink(url);
        await navigator.clipboard.writeText(url).catch(() => undefined);
      }
    } finally {
      setInviteLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <div>
        <h2 className="font-semibold">가입 방식</h2>
        <p className="text-sm text-muted-foreground mt-1">
          커뮤니티 참여 방법을 설정합니다. 언제든지 변경할 수 있습니다.
        </p>
      </div>
      <div className="space-y-2">
        {JOIN_MODE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              joinMode === opt.value ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <input
              type="radio"
              name="joinMode"
              value={opt.value}
              checked={joinMode === opt.value}
              disabled={loading}
              onChange={() => void saveMode(opt.value)}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-sm block">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </span>
          </label>
        ))}
      </div>
      {joinMode === "INVITE_ONLY" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={inviteLoading} onClick={() => void generateInvite()}>
            {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "초대 링크 생성"}
          </Button>
          {inviteLink && <p className="text-xs text-muted-foreground break-all">{inviteLink}</p>}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
