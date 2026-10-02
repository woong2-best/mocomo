"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { LEGAL_DMCA_AGENT_EMAIL } from "@/lib/legal-content";
import { useLocale } from "@/components/providers/locale-provider";

export function CultureWikiEditNotice() {
  const { t } = useLocale();

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm font-semibold text-foreground">{t("wiki.editNotice.title")}</p>
      </div>
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
        {t("wiki.form.englishOnlyNotice")}
      </p>
      <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
        <li>{t("wiki.editNotice.license")}</li>
        <li>{t("wiki.editNotice.liability")}</li>
        <li>
          {t("wiki.editNotice.dmca")}{" "}
          <a href={`mailto:${LEGAL_DMCA_AGENT_EMAIL}`} className="text-primary hover:underline">
            {LEGAL_DMCA_AGENT_EMAIL}
          </a>
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        {t("wiki.editNotice.seeAlso")}{" "}
        <Link href="/legal/culture-wiki" className="text-primary hover:underline">
          {t("wiki.editNotice.termsLink")}
        </Link>
      </p>
    </div>
  );
}
