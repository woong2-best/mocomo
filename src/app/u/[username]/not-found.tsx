import Link from "next/link";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

export default function UserNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-bold">{t("profile.userMissingTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("profile.userMissingBody")}</p>
      <Link href="/" className="text-sm font-semibold text-folk-cobalt hover:underline">
        {t("common.back")}
      </Link>
    </div>
  );
}
