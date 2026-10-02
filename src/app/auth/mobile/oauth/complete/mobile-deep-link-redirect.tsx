"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect } from "react";

/** Immediate redirect to mocomo:// deep link (AuthSession return URL). */
export function MobileDeepLinkRedirect({ url }: { url: string }) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <div className="space-y-4">
      <p>{t("auth.mocomo")}</p>
      <a
        href={url}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 font-medium text-primary-foreground"
      >
        {t("auth.soxhia3")}
      </a>
    </div>
  );
}
