import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

export function UsedAuctionRetiredNotice() {
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-foreground"
    >
      {t("used.s1oaa5oc")}
    </div>
  );
}
