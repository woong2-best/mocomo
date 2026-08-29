"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitUsedMarketAppeal } from "@/actions/used-market-appeal";
import {
  USED_MARKET_APPEAL_WINDOW_DAYS,
  USED_AUCTION_BID_CONSENT_LABEL,
} from "@/lib/used-auction-legal";
import { USED_MARKET_BAN_APPEAL_HINT, USED_MARKET_BAN_MESSAGE } from "@/lib/used-market-access";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type BanInfo = {
  bannedAt: Date;
  listingId: string | null;
  listingTitle: string | null;
};

type OpenAppeal = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
};

export function UsedMarketAppealForm({
  userEmail,
  banInfo,
  openAppeal,
}: {
  userEmail: string | null;
  banInfo: BanInfo;
  openAppeal: OpenAppeal | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("경매 낙찰 미결제 제재 이의 신청");
  const [content, setContent] = useState("");
  const [contactEmail, setContactEmail] = useState(userEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length >= 50 &&
    contactEmail.trim().length > 0 &&
    !busy &&
    !openAppeal;

  if (openAppeal) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold">이의 신청 검토 중</p>
            <p className="text-muted-foreground leading-relaxed">
              「{openAppeal.title}」 접수 건이 검토 중입니다. 중복 제출은 불가합니다.
            </p>
            <p className="text-xs text-muted-foreground">
              접수일: {new Date(openAppeal.createdAt).toLocaleString("ko-KR")}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={`mailto:${LEGAL_CONTACT_EMAIL}`}>고객센터 이메일 문의</Link>
        </Button>
      </div>
    );
  }

  if (submittedId) {
    return (
      <div className="space-y-4 text-center py-6">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
        <h2 className="text-xl font-bold">이의 신청이 접수되었습니다</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          담당자가 증빙 자료와 함께 검토합니다. 결과는 등록하신 이메일 또는 서비스 알림으로
          안내드립니다.
        </p>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.refresh()}>
          새로고침
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-2">
        <p className="font-semibold text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          중고거래 이용 제한
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">{USED_MARKET_BAN_MESSAGE}</p>
        <p className="text-xs text-muted-foreground">
          제재 적용: {new Date(banInfo.bannedAt).toLocaleString("ko-KR")}
          {banInfo.listingTitle ? ` · 관련 경매: ${banInfo.listingTitle}` : ""}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{USED_MARKET_BAN_APPEAL_HINT}</p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void (async () => {
            setBusy(true);
            setError("");
            const res = await submitUsedMarketAppeal({
              title: title.trim(),
              content: content.trim(),
              contactEmail: contactEmail.trim(),
            });
            setBusy(false);
            if ("error" in res && res.error) {
              setError(res.error);
              return;
            }
            if ("appealId" in res && res.appealId) {
              setSubmittedId(res.appealId);
            }
          })();
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="appeal-title">
            제목
          </label>
          <Input
            id="appeal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl"
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="appeal-content">
            소명 내용 (50자 이상)
          </label>
          <Textarea
            id="appeal-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="rounded-xl min-h-[160px]"
            placeholder="제재 사유에 대한 설명, 시스템 오류·판매자 요청 등 정당한 사유, 증빙 가능한 사실을 구체적으로 작성해 주세요."
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground">{content.trim().length} / 5000자</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="appeal-email">
            연락 이메일
          </label>
          <Input
            id="appeal-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="rounded-xl"
          />
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          제출하신 내용은 이의 신청 검토 목적으로만 사용됩니다. 허위 사실 기재 시 기각될 수
          있습니다. {USED_MARKET_APPEAL_WINDOW_DAYS}일 이내 접수를 권장합니다.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={!canSubmit}>
          {busy ? "접수 중…" : "이의 신청 제출"}
        </Button>
      </form>

      <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
        <p>
          이메일 문의:{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
        <p>
          입찰 시 동의 문구: {USED_AUCTION_BID_CONSENT_LABEL}{" "}
          <Link href="/legal/terms" className="text-primary hover:underline">
            이용약관 제8조
          </Link>
        </p>
      </div>
    </div>
  );
}
