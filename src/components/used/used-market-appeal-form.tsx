"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitUsedMarketAppeal } from "@/actions/used-market-appeal";
import {
  USED_MARKET_APPEAL_WINDOW_DAYS,
  USED_AUCTION_BID_CONSENT_LABEL_KEY,
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
  const [title, setTitle] = useState(t("used.s15w6v1h"));
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
            <p className="font-semibold">{t("used.sjvbd8o")}</p>
            <p className="text-muted-foreground leading-relaxed">
              {t("used.appealOpenReview", { title: openAppeal.title })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("used.appealSubmittedAt", {
                date: new Date(openAppeal.createdAt).toLocaleString("en-US"),
              })}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{t("used.sd8hc1f")}</Link>
        </Button>
      </div>
    );
  }

  if (submittedId) {
    return (
      <div className="space-y-4 text-center py-6">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
        <h2 className="text-xl font-bold">{t("used.s1xu8tc5")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("used.soscxro")}
        </p>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.refresh()}>
          {t("auth.reload")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-2">
        <p className="font-semibold text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {t("used.s1pqwjk2")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">{USED_MARKET_BAN_MESSAGE}</p>
        <p className="text-xs text-muted-foreground">
          {t("used.sanctionAppliedAt", {
            date: new Date(banInfo.bannedAt).toLocaleString("en-US"),
          })}
          {banInfo.listingTitle ? t("used.sgce31g", { v0: banInfo.listingTitle }) : ""}
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
              setError(errorText(res.error));
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
            {t("used.sz28d")}
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
            {t("used.s1mp44vh")}
          </label>
          <Textarea
            id="appeal-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="rounded-xl min-h-[160px]"
            placeholder={t("used.s1t0zpoa")}
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground">
            {t("used.appealCharCount", { count: String(content.trim().length) })}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="appeal-email">
            {t("used.s1qfevpl")}
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
          {t("used.appealPrivacyNotice", {
            days: String(USED_MARKET_APPEAL_WINDOW_DAYS),
          })}
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={!canSubmit}>
          {busy ? t("used.spf824u") : t("used.s148ea9j")}
        </Button>
      </form>

      <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
        <p>
          {t("used.emailInquiryLabel")}{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
        <p>
          {t("used.bidConsentIntro")} {t(USED_AUCTION_BID_CONSENT_LABEL_KEY)}{" "}
          <Link href="/legal/terms" className="text-primary hover:underline">
            {t("used.s19498lo")}
          </Link>
        </p>
      </div>
    </div>
  );
}
