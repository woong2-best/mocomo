import { useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";
import { normalizeMobileLocale } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";

/** Account language wins over the phone language after sign-in / settings save. */
export function AccountLocaleSync() {
  const { user } = useAuth();
  const { setLocale } = useI18n();

  useEffect(() => {
    if (!user?.locale) return;
    void setLocale(normalizeMobileLocale(user.locale));
  }, [setLocale, user?.locale]);

  return null;
}
