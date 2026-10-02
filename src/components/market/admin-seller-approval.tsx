"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
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
  stripeConnectOnboardingStatus: string;
  stripeConnectPayoutsEnabled: boolean;
  stripeConnectRequirementsDue: boolean;
  onboardingCompletedAt: Date | string | null;
  user: {
    username: string;
    email: string | null;
    countryCode: string;
    stripeConnectAccountId: string | null;
    stripeConnectOnboardedAt: Date | string | null;
  };
};

export function AdminSellerApprovalList({ sellers }: { sellers: PendingSeller[] }) {
  if (sellers.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("market.sbm70r2")}</p>;
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

  function approve() {
    setError("");
    startTransition(async () => {
      const res = await approveMarketplaceSeller(seller.id);
      if (res.error) {
        setError(errorText(res.error));
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
        setError(errorText(res.error));
        return;
      }
      router.refresh();
    });
  }

  const stripeLabel = seller.stripeConnectPayoutsEnabled
    ? seller.stripeConnectRequirementsDue
      ? t("market.stripe")
      : t("market.stripe_2")
    : seller.user.stripeConnectAccountId
      ? t("market.stripe_3")
      : t("market.stripe_4");

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
        {t("market.adminSellerMeta", {
          market: seller.sellingMarket,
          type: seller.sellerType ?? "-",
          stripe: stripeLabel,
          status: seller.stripeConnectOnboardingStatus,
        })}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("market.adminSellerContact")} {seller.user.email ?? "-"} ·{" "}
        {seller.user.stripeConnectAccountId ?? "-"}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button type="button" size="sm" disabled={pending} onClick={approve}>
          {t("market.sv0ens6")}
        </Button>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("market.s1o7dev0")}
          className="sm:max-w-xs h-9"
        />
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={reject}>
          {t("collab.reject")}
        </Button>
      </div>
    </li>
  );
}
