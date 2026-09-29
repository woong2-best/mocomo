"use client";

import { useState, useTransition } from "react";
import { openMarketplaceDispute } from "@/actions/marketplace-checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MARKETPLACE_DISPUTE_REASONS } from "@/lib/marketplace/protection-config";
import type { MarketplaceDisputeReason } from "@prisma/client";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

export function MarketplaceDisputeForm({
  orderId,
  disabled,
}: {
  orderId: string;
  disabled?: boolean;
}) {
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();
  const [disputeCode, setDisputeCode] = useState<MarketplaceDisputeReason>("NOT_RECEIVED");
  const [detail, setDetail] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [msg, setMsg] = useState("");

  function submit() {
    setMsg("");
    const text = detail.trim();
    if (!text) {
      setMsg(uiText(locale, "피해 내용을 입력해 주세요.", "Describe what happened."));
      return;
    }
    const urls = evidenceUrls
      .split(/[,\n\s]+/)
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, 12);
    startTransition(async () => {
      const res = await openMarketplaceDispute(orderId, text, disputeCode, urls);
      if (res.error) setMsg(res.error);
      else {
        setMsg(uiText(locale, "분쟁이 접수되었습니다. 거래 기록이 보관됩니다.", "Dispute filed. Trade records are preserved."));
        window.location.reload();
      }
    });
  }

  return (
    <section className="rounded-xl border border-destructive/35 bg-destructive/5 p-3 space-y-2">
      <p className="text-sm font-semibold">
        {uiText(locale, "분쟁 신청 / 사기 신고", "Dispute / fraud report")}
      </p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {uiText(
          locale,
          "접수 시 결제·채팅·배송 타임라인이 자동 저장되며, 경찰·소비자원 제출용 자료로 활용할 수 있습니다.",
          "Payment, chat, and shipping timelines are saved automatically for legal submission."
        )}
      </p>
      <select
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        value={disputeCode}
        disabled={disabled || pending}
        onChange={(e) => setDisputeCode(e.target.value as MarketplaceDisputeReason)}
      >
        {MARKETPLACE_DISPUTE_REASONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        className="w-full min-h-[88px] rounded-xl border border-border bg-background px-3 py-2 text-sm"
        value={detail}
        disabled={disabled || pending}
        onChange={(e) => setDetail(e.target.value)}
        placeholder={uiText(locale, "피해 경위·거래 상대 행위 등 상세 내용", "Detailed description of the incident")}
      />
      <Input
        value={evidenceUrls}
        disabled={disabled || pending}
        onChange={(e) => setEvidenceUrls(e.target.value)}
        placeholder={uiText(
          locale,
          "증거 URL (스크린샷·사진, 쉼표 또는 줄바꿈)",
          "Evidence URLs (screenshots, comma or newline)"
        )}
      />
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      <Button type="button" size="sm" variant="destructive" disabled={disabled || pending} onClick={submit}>
        {uiText(locale, "분쟁 접수", "Submit dispute")}
      </Button>
    </section>
  );
}
