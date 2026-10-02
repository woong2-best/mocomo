"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyMarketplaceSeller,
  startMarketplaceConnectOnboarding,
} from "@/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openStripeConnectOnboardingUrl } from "@/lib/marketplace/open-stripe-connect-url";
import { DEFAULT_EXPRESS_PAYOUT_COUNTRY } from "@/lib/marketplace/stripe-supported-countries";
import { PayoutCountryField } from "@/components/wallet/payout-country-field";

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
  const [payoutCountry, setPayoutCountry] = useState(DEFAULT_EXPRESS_PAYOUT_COUNTRY);

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
        setError(errorText(res.error));
        return;
      }
      setMessage(t("market.snzk2tv"));
      router.refresh();
    });
  }

  function connect() {
    setError("");
    startTransition(async () => {
      const res = await startMarketplaceConnectOnboarding(payoutCountry);
      if ("error" in res && res.error) {
        setError(errorText(res.error));
        return;
      }
      if ("url" in res && res.url) {
        openStripeConnectOnboardingUrl(res.url, false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder={t("market.sjd79tx")}
      />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder={t("market.sxv68")}
        rows={4}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
      <Input
        value={sns}
        onChange={(e) => setSns(e.target.value)}
        placeholder={t("market.sns_url")}
      />
      <textarea
        value={applyReason}
        onChange={(e) => setApplyReason(e.target.value)}
        placeholder={t("market.s1r58gll")}
        rows={3}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <PayoutCountryField value={payoutCountry} onChange={setPayoutCountry} id="apply-payout-country" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={apply}>
          {t("market.s1hbpofk")}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={connect}>
          {connectReady ? t("market.stripe_connect") : t("market.stripe_connect_2")}
        </Button>
      </div>
    </div>
  );
}
