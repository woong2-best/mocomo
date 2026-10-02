"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertTriangle } from "lucide-react";

export function SuspendedAccountBanner() {
  const session = useSession();
  const user = session.data?.user;
  if (!user?.isSuspendedReadOnly) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-[60] border-b border-red-900/40 bg-red-600 text-white shadow-md"
    >
      <div className="mx-auto max-w-5xl px-4 py-3 text-sm leading-relaxed">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 space-y-2">
            <p className="text-base font-bold">{t("account.s1r5f5f9")}</p>
            <p>
              {t("account.s1684pwa")}
            </p>
            <p>
              {t("account.s1uk93gl")} <strong>{t("account.read_only")}</strong> {t("account.sm87hav")}
            </p>
            <p>
              {t("account.seao3ss")}
            </p>
            <p>
              본 조치가 잘못 적용되었다고 판단되는 경우 아래의{" "}
              <Link href="/appeal" className="font-semibold underline underline-offset-2">
                {t("account.sxxunqg")}
              </Link>{" "}
              버튼을 통해 재심사를 요청할 수 있습니다.
            </p>
            <Link
              href="/appeal"
              className="inline-flex rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              {t("account.sxxunqg")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
