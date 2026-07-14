"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyMarketplaceSeller,
  startMarketplaceConnectOnboarding,
} from "@/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MarketplaceSellerApplyForm({
  initialName,
  connectReady,
}: {
  initialName?: string;
  connectReady?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(initialName ?? "");
  const [bio, setBio] = useState("");
  const [applyReason, setApplyReason] = useState("");
  const [sns, setSns] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function apply() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const snsLinks = sns.trim()
        ? { homepage: sns.trim() }
        : undefined;
      const res = await applyMarketplaceSeller({
        displayName,
        bio,
        applyReason,
        snsLinks,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage("판매자 프로필이 준비되었습니다. 상품을 등록할 수 있습니다.");
      router.refresh();
    });
  }

  function connect() {
    setError("");
    startTransition(async () => {
      const res = await startMarketplaceConnectOnboarding();
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("url" in res && res.url) {
        window.location.href = res.url;
      }
    });
  }

  return (
    <div className="space-y-4">
      <Input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="판매자 닉네임"
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="소개"
        rows={4}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
      <Input
        value={sns}
        onChange={(e) => setSns(e.target.value)}
        placeholder="SNS / 포트폴리오 URL"
      />
      <textarea
        value={applyReason}
        onChange={(e) => setApplyReason(e.target.value)}
        placeholder="판매 신청 사유 (선택)"
        rows={3}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={apply}>
          판매자 등록
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={connect}>
          {connectReady ? "Stripe Connect 재연결" : "Stripe Connect 정산 연결"}
        </Button>
      </div>
    </div>
  );
}
