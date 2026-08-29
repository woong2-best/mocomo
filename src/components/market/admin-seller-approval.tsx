"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  approveMarketplaceSeller,
  rejectMarketplaceSeller,
} from "@/actions/marketplace-admin";
import { formatSellerCode } from "@/lib/marketplace/seller-code";

type PendingSeller = {
  id: string;
  displayName: string;
  sellerType: string | null;
  sellingMarket: string;
  kycStatus: string;
  kycLegalName: string | null;
  kycIdType: string | null;
  kycIdHint: string | null;
  kycDocumentKey: string | null;
  settlementDeclaredAt: Date | string | null;
  onboardingCompletedAt: Date | string | null;
  user: {
    username: string;
    email: string | null;
    countryCode: string;
    phone: string | null;
    phoneVerified: Date | string | null;
    stripeConnectAccountId: string | null;
    stripeConnectOnboardedAt: Date | string | null;
  };
};

export function AdminSellerApprovalList({ sellers }: { sellers: PendingSeller[] }) {
  if (sellers.length === 0) {
    return <p className="text-sm text-muted-foreground">예외 검수 대기 판매자가 없습니다.</p>;
  }

  return (
    <ul className="space-y-3">
      {sellers.map((s) => (
        <AdminSellerApprovalCard key={s.id} seller={s} />
      ))}
    </ul>
  );
}

function AdminSellerApprovalCard({ seller }: { seller: PendingSeller }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [showKycImage, setShowKycImage] = useState(false);

  function approve() {
    setError("");
    startTransition(async () => {
      const res = await approveMarketplaceSeller(seller.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function reject() {
    setError("");
    startTransition(async () => {
      const res = await rejectMarketplaceSeller(seller.id, reason);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-2xl border border-border/60 p-4 space-y-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          {seller.displayName}{" "}
          <span className="text-muted-foreground font-normal">@{seller.user.username}</span>
        </p>
        <p className="text-xs text-muted-foreground font-mono">{formatSellerCode(seller.id)}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        시장 {seller.sellingMarket} · 유형 {seller.sellerType ?? "-"} · KYC {seller.kycStatus}
        {seller.kycLegalName ? ` · ${seller.kycLegalName}` : ""}
        {seller.kycIdType ? ` · ${seller.kycIdType}` : ""}
        {seller.kycIdHint ? ` · ****${seller.kycIdHint}` : ""}
      </p>
      {seller.kycDocumentKey ? (
        <div className="space-y-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowKycImage((v) => !v)}
          >
            {showKycImage ? "신분증 이미지 숨기기" : "신분증 이미지 확인 (PII)"}
          </Button>
          {showKycImage ? (
            <div className="rounded-lg border border-border/60 overflow-hidden bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/market/seller-kyc-document?profileId=${encodeURIComponent(seller.id)}`}
                alt="제출 신분증"
                className="max-h-64 w-full object-contain bg-black/5"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-amber-800">신분증 이미지 없음</p>
      )}
      <p className="text-xs text-muted-foreground">
        이메일 {seller.user.email ?? "-"}
        {seller.user.phoneVerified
          ? ` · 휴대폰 인증됨 ${seller.user.phone ?? ""}`
          : " · 휴대폰 미인증(해외 허용)"}
        {" · "}
        {seller.user.stripeConnectOnboardedAt || seller.user.stripeConnectAccountId
          ? "Stripe Connect 연결"
          : seller.settlementDeclaredAt
            ? "정산 검토 요청"
            : "정산 미등록"}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button type="button" size="sm" disabled={pending} onClick={approve}>
          승인 (상품 등록 허용)
        </Button>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="거절 사유"
          className="sm:max-w-xs h-9"
        />
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={reject}>
          거절
        </Button>
      </div>
    </li>
  );
}
