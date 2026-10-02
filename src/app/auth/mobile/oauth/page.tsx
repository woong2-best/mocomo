import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { Suspense } from "react";
import { getAuthConfigStatus } from "@/lib/auth-env";
import { MobileOAuthStartClient } from "./mobile-oauth-start-client";

export default function MobileOAuthStartPage() {
  const { googleOAuth } = getAuthConfigStatus();
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
          {t("auth.ssl94sx")}
        </div>
      }
    >
      <MobileOAuthStartClient googleOAuth={googleOAuth} />
    </Suspense>
  );
}
