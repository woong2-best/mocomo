import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { getMySubcultureWtbAlerts } from "@/actions/subculture-wtb";
import { UsedWtbAlertList } from "@/components/used/used-wtb-alert-list";
import Link from "next/link";

export async function UsedWtbMySection() {
  const rows = await getMySubcultureWtbAlerts();
  const alerts = rows.map((a) => ({
    id: a.id,
    workTitle: a.workTitle,
    animeSlug: a.animeSlug,
    productType: a.productType,
    characterName: a.characterName,
    maxPrice: a.maxPrice,
    currency: a.currency,
    note: a.note,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("used.wtbAlertsHeading", { count: String(alerts.length) })}
        </h2>
        {alerts.length > 0 && (
          <Link href="/market/wtb" className="text-xs font-semibold text-primary hover:underline">
            {t("explore.viewAll")}
          </Link>
        )}
      </div>
      <UsedWtbAlertList alerts={alerts} />
    </section>
  );
}
