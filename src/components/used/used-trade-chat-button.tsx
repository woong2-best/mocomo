"use client";


import { isPhoneVerificationError } from "@/lib/error-codes";
import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startUsedTradeChat } from "@/actions/used-market";
import { usedMarketVerifyPath } from "@/lib/used-market-verify-path";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";



export function UsedTradeChatButton({
  listingId,
  countryCode = "KR",
}: {
  listingId: string;
  countryCode?: string;
}) {
  const { locale , t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function chat() {
    setError("");
    setLoading(true);
    const res = await startUsedTradeChat(listingId);
    setLoading(false);
    if ("error" in res && res.error) {
      if (isPhoneVerificationError(res.error)) {
        router.push(usedMarketVerifyPath(`/market/${listingId}`, countryCode));
        return;
      }
      setError(errorText(res.error));
      return;
    }
    if ("roomId" in res && res.roomId) router.push(`/messages/${res.roomId}`);
  }

  return (
    <div className="flex-1 space-y-1">
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
      <Button
        type="button"
        variant="secondary"
        onClick={() => void chat()}
        disabled={loading}
        size="lg"
        className="w-full h-12 gap-2"
      >
        <MessageSquare className="h-5 w-5" />
        {loading
          ? t("live.external.connecting")
          : t("ui.chat")}
      </Button>
    </div>
  );
}
