"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HumanChallengeQuestion } from "@/lib/human-challenge-types";
import { issueWebtoonHumanChallenge, verifyWebtoonHumanAccess } from "@/actions/webtoon";
import { SignupHumanChallenge } from "@/components/auth/signup-human-challenge";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export function WebtoonAccessGate() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<HumanChallengeQuestion | null>(null);
  const [token, setToken] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const loadChallenge = useCallback(async () => {
    setErr("");
    setSelectedId("");
    const next = await issueWebtoonHumanChallenge();
    setChallenge(next);
    setToken(next.token);
  }, []);

  useEffect(() => {
    void loadChallenge();
  }, [loadChallenge]);

  async function onSelect(choiceId: string) {
    setSelectedId(choiceId);
    setLoading(true);
    setErr("");
    const res = await verifyWebtoonHumanAccess(token, choiceId);
    setLoading(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      void loadChallenge();
      return;
    }
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-6 space-y-4">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-10 w-10 mx-auto text-[#0096fa]" />
          <h2 className="text-lg font-bold">일러스트 구역 접속 확인</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            판매 작품 구역은 캡처·녹화가 제한됩니다. 먼저 사람인지 간단히 확인해 주세요.
          </p>
        </div>
        {challenge ? (
          <SignupHumanChallenge
            challenge={challenge}
            loading={loading}
            onRefresh={() => void loadChallenge()}
            onSelect={(id) => void onSelect(id)}
            selectedId={selectedId}
          />
        ) : (
          <p className="text-sm text-center text-muted-foreground">문제 불러오는 중…</p>
        )}
        {err && <p className="text-sm text-destructive text-center">{err}</p>}
        <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => history.back()}>
          돌아가기
        </Button>
      </div>
    </div>
  );
}
